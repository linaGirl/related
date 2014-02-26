!function(){

	var   Class 		= require('ee-class')
		, arg 			= require('ee-arguments')
		, async 		= require('ee-async')
		, RelatingSet 	= require('./RelatingSet')
		, EventEmitter 	= require('ee-event-emitter')
		, log 			= require('ee-log');




	module.exports = new Class({
		inherits: EventEmitter

		, init: function(options) {
			//log.error('initializing', options.definition.name);
			this._setProrperty('_defintion', options.definition);
			this._setProrperty('_orm', options.orm);

			// remove deprecated parent property
			delete this.parent;

			this._setProrperty('_values', {});
			this._setProrperty('_changedValues', []);
			this._setProrperty('_mappings', {});
			this._setProrperty('_belongsTo', {});
			this._setProrperty('_columns', {});
			this._setProrperty('_references', {});
			this._setProrperty('_changedReferences', []);
			this._setProrperty('_mappingIds', [], true);
			this._setProrperty('_relatingSets', options.relatingSets);
			
			this._setProrperty('_fromDb', options.isFromDB || false);

			//this._initializeRelatingSets(true);

			if (options.parameters) this._setValues(options.parameters);
		}



		, _initializeRelatingSets: function(partial) {

			this._mappings.forEach(function(definition){
				if (!this[definition.mapping.name] && (!partial || !this._relatingSets || this._relatingSets[definition.mapping.name])) {
					this[definition.mapping.name] = new RelatingSet({
						  orm: 			this._orm
						, definition: 	definition.mapping
						, column: 		definition.column
						, related: 		this
						, database: 	this._defintion.getDatabaseName()
					});
				}
			}.bind(this));

			this._belongsTo.forEach(function(definition){
				if (!this[definition.belongs.name] && (!partial || !this._relatingSets || this._relatingSets[definition.belongs.name])) {
					this[definition.belongs.name] = new RelatingSet({
						  orm: 			this._orm
						, definition: 	definition.belongs
						, column: 		definition.column
						, related: 		this
						, database: 	this._defintion.getDatabaseName()
					});
				}
			}.bind(this));
		}


		, _setValues: function(values){
			Object.keys(values).forEach(function(property){
				if (property === '____id____') this._mappingIds.push(values[property]);
				else this._values[property] = values[property];
			}.bind(this));
		}



		, _setProrperty: function(name, value, writable){
			Object.defineProperty(this, name, {value: value, writable: writable});
		}




		, loadAll: function(callback){
			return this.reload(callback);
		}


		, isFromDatabase: function(){
			return this._fromDb;	
		}


		, reload: function(callback){
			var query = {
				  select 	: ['*']
				, from 	 	: this._defintion.getTableName()
				, database 	: this._defintion.getDatabaseName()
				, filter 	: {}
			};

			callback = callback || function(){};


			this._defintion.primaryKeys.forEach(function(key){
				query.filter[key] = this[key];
			}.bind(this));

			this._orm.getDatabase().query(query, function(err, data){
				if (err) callback(err);
				else {
					if (!data.length) callback(new Error('Failed to load data from database, record doesn\'t exist anymore!'));
					else {
						this._setValues(data[0]);
						this._fromDb = true;
						callback(null, this);
					}
				}
			}.bind(this));

			return this;
		}



		, _getChangedValues: function() {
			var data = {};

			this._changedValues.forEach(function(key){
				data[key] = this[key];
			}.bind(this));

			return data;
		}


		, save: function(){
			var   callback = arg(arguments, 'function', function(){})
				, noReload = arg(arguments, 'boolean', false);

			// transactio management
			this.getOrm().transaction().getDatabase().getConnection(function(err, connection){
				if (err) callback(err);
				else {
					this._save(connection, noReload, function(err){
						if (err) {
							connection.rollback(function(transactionErr){
								if (transactionErr) callback(transactionErr);
								else callback(err);
							}.bind(this));							
						}
						else {
							connection.commit(callback);
						}
					}.bind(this));
				}
			}.bind(this));

			return this;
		}




		, _save: function(connection, noReload, callback) {
			var query = {
			      from 	 	: this._defintion.getTableName()
				, database 	: this._defintion.getDatabaseName()
				, filter	: {}
				, values 	: this._fromDb ? this._getChangedValues() : this._values
			};


			this._saveChildren(connection, noReload, function(err){
				if (err) callback(err);
				else {

				}
			}.bind(this));


			// insert or update?
			if (this._fromDb){
				if (this._changedValues.length) {

					this._defintion.primaryKeys.forEach(function(key){
						query.filter[key] = this[key];
					}.bind(this));

					this._orm.getDatabase().query('update', query, callback);
				}
				else callback();
			}
			else {
				this._orm.getDatabase().query('insert', query, function(err, result){
					if (err) callback(err);
					else {
						if (result.type === 'id'){
							// reload
							if (this._defintion.primaryKeys.length === 1){
								this[this._defintion.primaryKeys[0]] = result.id;
								if (noReload) this.reload(callback);
								else callback(null, this);
							}
							else throw new Error('Cannot laod record with more than one primarykey!');
						}
						else throw new Error('not implemented!');
					}
				}.bind(this));
			}
		}



		, _saveChildren: function(connection, noReload, callback) {
			async.each(this._changedValues, function(key, next){
				var value;

				if (this._references[key]) {
					// reference changed
					value = this._references[key];

					if (value.isQuery) {
						value.limit(1);
						value.find(function(err, records){
							if (err) next(err);
							//else value[this._referencedColumns[]] = records.length ? records.first() : null;
						}.bind(this));
					}
					else value._save(connection, noReload, next);
				}
				else if (this._mappings[key]) {
					// mapping changed
					this._mappings[key]._save(connection, noReload, next);
				}
				else if (this._belongsTo[key]) {
					// belongsto checnged
					this._belongsTo[key]._save(connection, noReload, next);
				}
				else next();
			}.bind(this), function(err, results){
				if (err) callback(results.filter(function(err){return err instanceof Error;})[0]);
				else callback();
			}.bind(this));
		}
	});
}();
