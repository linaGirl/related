!function(){

	var   Class 		= require('ee-class')
		, log 			= require('ee-log')
		, type 			= require('ee-types')
		, EventEmitter 	= require('ee-event-emitter')
		, arg 			= require('ee-arguments')
		, pluralize 	= require('pluralize')
		, async 		= require('ee-async')
		, DBCluster 	= /*require('ee-db-cluster'); //*/require('../../ee-db-cluster');


	var   Database 		= require('./Database')
		, Functions 	= require('./Functions')
		, StaticORM 	= require('./StaticORM')
		, staticORM;




	var ORM = new Class({
		inherits: EventEmitter

		, init: function(options) {
			delete this.parent;

			this._setProrperty('_options', options);
			this._setProrperty('_dbNames', []);

			this.fn = new Functions();

			// db connectivity
			this._initializeDatabase(options);

			this._initializeOrm(function(err){
				this.emit('load', err);
			}.bind(this));
		}



		, transaction: function(){
			if (this.isTransaction) return this;
			else {
				var instance = {
					  __proto__ 		: this
					, isTransaction 	: true
					, _db: {
						  __proto__ 	: this._db
						, getConnection : function(callback){
							this._getTransactionConnection(callback, instance);
						}.bind(this)
					}
				};


				this._dbNames.forEach(function(databaseName){
					instance[databaseName]._setOrm(instance);
				}.bind(this));

				return instance;
			}
		}



		, commit: function(callback) {
			if (this._transactionConnection) {
				this._transactionConnection.commit(callback);
				delete this._transactionConnection;
			}
			else callback(new Error('Cannot commit transaction. no active transaction!'));
		}


 
		, rollback: function(callback) {
			if (this._transactionConnection) {
				this._transactionConnection.rollback(callback);
				delete this._transactionConnection;
			}
			else callback(new Error('Cannot rollback transaction. no active transaction!'));
		}




		, _getTransactionConnection: function(callback, instance) {
			if (instance._transactionConnection) {
				callback(null, instance._transactionConnection);
			}
			else {
				this._db.getConnection(false, function(err, connection){
					if (err) callback(err);
					else {
						instance._transactionConnection = connection;
						instance._transactionConnection.startTransaction();

						callback(null, instance._transactionConnection);
					}
				}.bind(this));
			}
		}


		, _setProrperty: function(name, value){
			Object.defineProperty(this, name, {value: value});
		}


		, _initializeOrm: function(callback) {
			this._db.describe(function(err, databases){
				if (err) callback(err);
				else {
					// initialize orm for each database
					async.each(Object.keys(databases), function(databaseName, next){
						if (this[databaseName]) next(new Error('Failed to load ORM for database «'+databaseName+'», the name is reserved for the orm.').setName('ORMException'));
						else {
							this._dbNames.push(databaseName);

							// create names for mapping / reference accessor, handle duplicates
							this._manageAccessorNames(databases[databaseName]);

							//log(databases[databaseName]);

							this[databaseName] = new Database({
								  orm: 			this
								, definition: 	databases[databaseName]
								, on: {
									load: function(){
										setTimeout(next, 0);
									}
								}
							});
						}
					}.bind(this), function(err, results){
						if (err) callback(results.filter(function(x){log(type(x)); return type.error(x)})[0]);
						else callback();
					}.bind(this));
				}
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
							mapping.name = this._getPluralAccessorName(mapping.name);
							name = mapping.name;

							if (model.columns[name]) {
								// the name is used by a column, cannot reference directly
								mapping.useGenericAccessor = true;
							}
							else if (usedNames[name]) {
								// the name was used before by either a mapping or a reference
								// we cannot use it
								usedNames[name].useGenericAccessor = true;
								mapping.useGenericAccessor = true;
							}
							else usedNames[name] = mapping;
						}.bind(this));
					}
					if (column.belongsTo) {
						column.belongsTo.forEach(function(beloning){
							beloning.name = this._getPluralAccessorName(beloning.name);
							name = beloning.name;

							if (model.columns[name]) {
								// the name is used by a column, cannot reference directly
								beloning.useGenericAccessor = true;
							}
							else if (usedNames[name]) {
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
							// the name is used by a column, cannot reference directly
							column.useGenericAccessor = true;
						}
						else if (usedNames[name]) {
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


		, getDatabase: function(){
			return this._db;
		}


		, _initializeDatabase: function(options){
			this._setProrperty('_db', new DBCluster({type: options.db.type}));

			options.db.hosts.forEach(function(config){
				this._db.addNode(config);
			}.bind(this));
		}



		, _getPluralAccessorName: function(id) {
			var parts = id.match(/(?:^|[A-Z0-9])[^A-Z0-9]+/g);

			if (parts){
				if (parts.length === 1) id = pluralize.plural(id);
				else id = parts.slice(0, parts.length-1).join('')+pluralize.plural(parts[parts.length-1]);
			}
			else id = pluralize.plural(id);
			
			return id;
		}
	});
	
	
	staticORM = new StaticORM();
	Object.keys(Object.getPrototypeOf(staticORM)).forEach(function(key){
		if(!ORM[key]) ORM[key] = staticORM[key];
	});
	
	module.exports = ORM;
	
}();
