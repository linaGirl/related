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

			// check for changes
			this.on('change', this._setChanged.bind(this));


			this._setProrperty('_values', {});
			this._setProrperty('_changedValues', []);
			this._setProrperty('_mappings', {});
			this._setProrperty('_belongsTo', {});
			//this._setProrperty('_columns', {});
			this._setProrperty('_references', {});
			this._setProrperty('_changedReferences', []);
			this._setProrperty('_mappingIds', [], true);
			this._setProrperty('_hasChanges', false, true);
			this._setProrperty('_relatingSets', options.relatingSets);

			this._setProrperty('_fromDb', options.isFromDB || false);

			//this._initializeRelatingSets(true);

			if (options.parameters) this._setValues(options.parameters);
		}


		, _setChanged: function() {
			this._hasChanges = true;
		}


		, getDefinition: function() {
			return this._defintion;
		}


		, getEntityName: function() {
			this._defintion.name;
		}

/*

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
*/

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


		, isSaved: function() {
			this.isFromDatabase() && !this._hasChanges;
		}


		, reload: function(callback, connection){
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

			(connection || this._orm.getDatabase()).query(query, function(err, data){
				if (err) callback(err);
				else {
					if (!data.length) callback(new Error('Failed to load data from database, record doesn\'t exist!'));
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






		, delete: function(callback) {
			var   callback 		= arg(arguments, 'function', function(){})
				, transaction 	= arg(arguments, 'object');	

			if (transaction) {
				this._delete(transaction, callback);
			}
			else {
				transaction = this.getDatabase().createTransaction();

				this._delete(transaction, function(err){
					if (err) {
						transaction.rollback(function(transactionErr){
							if (transactionErr) callback(transactionErr);
							else callback(err);
						}.bind(this));
					}
					else {
						transaction.commit(function(err){
							if (err) callback(err);
							else {
								this._fromDb = false;
								callback(null, this);
							}
						}.bind(this));
					}
				}.bind(this));
			}

			return this;
		}




		, _delete: function(transaction, callback) {

			var query = {
			      from 	 	: this._defintion.getTableName()
				, database 	: this._defintion.getDatabaseName()
				, filter	: {}
				, limit 	: 1
			};

			// icannot delete a model not loaded from the database
			if (this._fromDb){
				this._defintion.primaryKeys.forEach(function(key){
					query.filter[key] = this[key];
				}.bind(this));

				if (!Object.keys(query.filter).length) {
					log.dir(query);
					throw new Error('Failed to create proper delete query, no filter was created (see query definition above)');
				}
				else transaction.executeQuery('delete', query, callback);
			}
			else callback(new Error('Cannot delete model, it wasn\'t loaded from the database!'));
		}





		, save: function() {
			var   callback 		= arg(arguments, 'function', function(){})
				, noReload 		= arg(arguments, 'boolean', false)
				, transaction 	= arg(arguments, 'object');

			// transactio management
			if (transaction) {
				this._save(transaction, noReload, callback);
			}
			else {
				transaction = this.getDatabase().createTransaction();

				this._save(transaction, noReload, function(err){
					if (err) {
						transaction.rollback(function(transactionErr){
							if (transactionErr) callback(transactionErr);
							else callback(err);
						}.bind(this));
					}
					else {
						transaction.commit(function(err){
							if (err) callback(err);
							else callback(null, this);
						}.bind(this));
					}
				}.bind(this));
			}

			return this;
		}




		, _save: function(transaction, noReload, callback) {
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

					transaction.executeQuery('update', query, callback);
				}
				else callback();
			}
			else {
				transaction.executeQuery('insert', query, function(err, result){
					if (err) callback(err);
					else {
						if (result.type === 'id'){
							
							if(result.id) {
								if (this._defintion.primaryKeys.length === 1){
									this[this._defintion.primaryKeys[0]] = result.id;
								}
								else throw new Error('Cannot load record with more than one primarykey when at least on of the primary keys has an autoincermented value!');
							}
							
							if (!noReload) this.reload(callback, connection);
							else callback(null, this);
						}
						else throw new Error('not implemented!');
					}
				}.bind(this));
			}
		}



		, _saveChildren: function(transaction, noReload, callback) {

			// save references
			async.each(this._changedReferences, function(key, next){
				var   value  = this._references[key]
					, column = this._columns[key].column;;


				// a query was set as reference
				if (value.isQuery) {
					value.limit(1);

					value.findOne(function(err, model) {
						if (err) next(err);
						else if (model) {
							this[column.name] = null;
							next();
						}
						else {
							this[column.name] = model[column.referencedColumn];
							next();
						}
					}.bind(this));
				}
				else {
					if (value.isSaved) {
						this[column.name] = value[column.referencedColumn];
						next();
					}
					else value._save(transaction, noReload, next);
				}
			}.bind(this), function(err, results){
				if (err) callback(err);
				else callback();
			}.bind(this));
		}
	});
}();
