!function(){

	var   Class 		= require('ee-class')
		, log 			= require('ee-log')
		, type 			= require('ee-types')
		, EventEmitter 	= require('ee-event-emitter')
		, arg 			= require('ee-arguments')
		, async 		= require('ee-async')
		, DBCluster 	= require('ee-db-cluster'); //*/require('../../ee-db-cluster');


	var   Database 		= require('./Database')
		, StaticORM 	= require('./StaticORM')
		, staticORM;




	var ORM = new Class({
		inherits: EventEmitter

		, init: function(options) {
			this._setProperty('_options', options);
			this._setProperty('_dbNames', []);
			this._setProperty('_databases', {});

			// db connectivity
			this._initializeDatabases(options);

			this._initializeOrm(function(err){
				this.emit('load', err);
			}.bind(this));
		}


		, _setProperty: function(name, value){
			Object.defineProperty(this, name, {value: value});
		}


		, _initializeOrm: function(callback) {
			async.each(this._dbNames
			// get definition from database
			, function(databaseName, next){
				this._databases[databaseName].describe([databaseName], function(err, databases){
					if (err) next(err);
					else {
						// push config to next step
						next(null, databaseName, databases[databaseName]);
					}
				}.bind(this));
			}.bind(this)

			// initialize orm per databse
			, function(databaseName, definition, next){
				if (this[databaseName]) next(new Error('Failed to load ORM for database «'+databaseName+'», the name is reserved for the orm.').setName('ORMException'));
				else {

					// create names for mapping / reference accessor, handle duplicates
					this._manageAccessorNames(definition);

					this[databaseName] = new Database({
						  orm: 			this
						, definition: 	definition
						, database: 	this._databases[databaseName]
						, on: {
							load: next
						}
					});
				}
			}.bind(this)

			// check for errors
			, function(err, results){
				if (err) callback(err);
				else callback();
			}.bind(this));	
		}

		


		, _manageAccessorNames: function(definition) { 
			Object.keys(definition).forEach(function(tablename){
				var   model 	= definition[tablename]
					, usedNames = {};

				Object.keys(model.columns).forEach(function(columnName){
					var column = model.columns[columnName]
						, name;

					if (column.mapsTo) {
						column.mapsTo.forEach(function(mapping){ 
							name = mapping.name;

							if (model.columns[name]) {
								// the name is used by a column, cannot reference directly
								log.warn('«'+model.name+'» cannot use the accessor «'+name+'», it\'s already used by another property');
								mapping.useGenericAccessor = true;
							}
							else if (usedNames[name]) {
								// the name was used before by either a mapping or a reference
								// we cannot use it
								log.warn('«'+model.name+'» cannot use the accessor «'+name+'», it\'s already used by another property');
								usedNames[name].useGenericAccessor = true;
								mapping.useGenericAccessor = true;
							}
							else usedNames[name] = mapping;
						}.bind(this));
					}
					if (column.belongsTo) {
						column.belongsTo.forEach(function(beloning){
							name = beloning.name;

							if (model.columns[name]) {
								log.warn('«'+model.name+'» cannot use the accessor «'+name+'», it\'s already used by another property');
								// the name is used by a column, cannot reference directly
								beloning.useGenericAccessor = true;
							}
							else if (usedNames[name]) {
								log.warn('«'+model.name+'» cannot use the accessor «'+name+'», it\'s already used by another property');
								// the name was used before by either a mapping or a reference
								// we cannot use it
								usedNames[name].useGenericAccessor = true;
								beloning.useGenericAccessor = true;
							}
							else usedNames[name] = beloning;
						}.bind(this));
					}
					if (column.referencedModel) {
						name = column.referencedModel.name;

						if (model.columns[name]) {
							log.warn('«'+model.name+'» cannot use the accessor «'+name+'», it\'s already used by another property');
							// the name is used by a column, cannot reference directly
							column.useGenericAccessor = true;
						}
						else if (usedNames[name]) {
							log.warn('«'+model.name+'» cannot use the accessor «'+name+'», it\'s already used by another property');
							// the name was used before by either a mapping or a reference
							// we cannot use it
							usedNames[name].useGenericAccessor = true;
							column.useGenericAccessor = true;
						}
						else usedNames[name] = column;
					}
				}.bind(this));
			}.bind(this));
		}


		, getDatabase: function(id){
			if (!type.string(id) || !id.length) throw new Error('cannot return a db without knowing which on to return (argument 0 must be the db id!)');
			return this._databases[id];
		}


		, _initializeDatabases: function(options){
			if (type.object(options) && type.object(options.db)) {
				Object.keys(options.db).forEach(function(databaseName){
					if (!type.string(options.db[databaseName].type)) throw new Error('['+databaseName+'] > Database type not in config specified (type: \'mysql\' / \'postgres\')!');
					if (!type.array(options.db[databaseName].hosts) || !options.db[databaseName].hosts.length) throw new Error('['+databaseName+'] > Please add at least one host per db in the config!');
						
					this._dbNames.push(databaseName);

					this._databases[databaseName] = new DBCluster({type: options.db[databaseName].type});

					options.db[databaseName].hosts.forEach(function(config){
						config.database = databaseName;
						this._databases[databaseName].addNode(config);
					}.bind(this));
				}.bind(this));
			}
			else throw new Error('no database configuration present!');
		}
	});
	
	


	staticORM = new StaticORM();
	Object.keys(Object.getPrototypeOf(staticORM)).forEach(function(key){
		if(!ORM[key]) ORM[key] = staticORM[key];
	});
	
	module.exports = ORM;
	
}();
