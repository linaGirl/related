!function(){

	var   Class 		= require('ee-class')
		, arg 			= require('ee-arguments')
		, async 		= require('ee-async')
		, RelatingSet 	= require('./RelatingSet')
		, EventEmitter 	= require('ee-event-emitter')
		, type 			= require('ee-types')
		, log 			= require('ee-log');




	module.exports = new Class({
		inherits: EventEmitter

		, init: function(options) {
			//log.error('initializing', options.definition.name);
			this._setProperty('_defintion', options.definition);
			this._setProperty('_orm', options.orm);

			// check for changes
			this.on('change', this._setChanged.bind(this));


			this._setProperty('_values', {});
			this._setProperty('_changedValues', []);
			this._setProperty('_mappings', {}); // holds the mapping instances, will be created if accessed
			this._setProperty('_belongsTo', {}); // holds the belongs to instances, will be created if accessed
			//this. _setProperty('_columns', {});
			this._setProperty('_references', {});
			this._setProperty('_changedReferences', []);
			this._setProperty('_mappingIds', [], true);
			this._setProperty('_hasChanges', false, true);
			this._setProperty('_relatingSets', options.relatingSets);
			this._setProperty('_getDatabase', options.getDatabase);

			this._setProperty('_fromDb', options.isFromDB || false, true);

			//this._initializeRelatingSets(true);

			if (options.parameters) this._setValues(options.parameters);
		}


		, _setChanged: function() {
			this._hasChanges = true;
		}


		, getDefinition: function() {
			return this._defintion;
		}


		, isModel: function() {
			return true;
		}


		, getEntityName: function() {
			return this._defintion.name;
		}



		, _setValues: function(values){
			Object.keys(values).forEach(function(property){
				var item = values[property];

				if (type.object(item) && !type.null(item) && ((item.isModel && item.isModel()) || item.isQuery)) {
					// we got a model
					var name = item.getEntityName();


					if (!type.undefined(this[name])){
						if (type.boolean(this[name].isMapping)){
							// relating set
							this[name].push(item);
						}

						// must be a reference ...
						this[name] = item;
					}
					else throw new Error('Cannot add «'+name+'» model to «'+this.getEntityName()+'» model! there is no relation between the thwo models!');					
				}
				else if (type.array(item)) {
					item.forEach(function(obj){
						if (type.object(obj) && !type.null(obj) && ((obj.isModel && obj.isModel()) || obj.isQuery)) {
							var name = obj.getEntityName();

							if (!type.undefined(this[name])){
								if (type.boolean(this[name].isMapping)){
									// relating set
									this[name].push(obj);
								}

								// must be a reference ...
								this[name] = obj;
							}
							else throw new Error('Cannot add «'+name+'» model to «'+this.getEntityName()+'» model! there is no relation between the thwo models!');	
						}
						else throw new Error('Expected a Query or a Model for the key «'+property+'»!');
					}.bind(this));
				}
				else if (property === '____id____') this._mappingIds.push(item);
				else this._values[property] = item;
			}.bind(this));
		}


		, _setProperty: function(name, value, writable){
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


		, reload: function(callback, transaction){
			if (!this.isFromDatabase()) return callback(new Error('Cannot reload record «'+this.getEntityName()+'» without saving it first!'));

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

			(transaction || this._getDatabase()).executeQuery(query, function(err, data){
				if (err) callback(err);
				else {
					if (!data.length) callback(new Error('Failed to load data from database, record doesn\'t exist!'));
					else {
						this._setValues(data[0]);
						this._fromDb = true;

						this._reloadRelated(function(err){
							callback(err, this);
						}.bind(this), transaction);
					}
				}
			}.bind(this));

			return this;
		}


		, _reloadRelated: function(callback, transaction) {
			async.each(Object.keys(this._mappings), function(keyName, next){
				this._mappings[keyName].reload(next, transaction);
			}.bind(this), callback);
/*
			Object.keys(this._belongsTo).forEach(function(keyName){
				
			}.bind(this));

			Object.keys(this._references).forEach(function(keyName){
				
			}.bind(this));*/
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





		, clone: function() {
			var clonedInstance = new (this._getDatabase()[this._defintion.model.name])();

			
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
							else {
								this._fromDb = true;
								this.reload(function(err){
									if (err) callback(err);
									else callback(null, this);
								}.bind(this));
							}
						}.bind(this));
					}
				}.bind(this));
			}

			return this;
		}




		, _save: function(transaction, noReload, callback) {
			this._saveReferences(transaction, noReload, function(err){
				if (err) callback(err);
				else {
					var query = {
					      from 	 	: this._defintion.getTableName()
						, database 	: this._defintion.getDatabaseName()
						, filter	: {}
						, values 	: this._fromDb ? this._getChangedValues() : this._values
					};

					if (this._defintion.primaryKeys.length) {
						query.returning = this._defintion.primaryKeys;
					}

					if (this._fromDb){
						if (this._changedValues.length) {

							this._defintion.primaryKeys.forEach(function(key){
								query.filter[key] = this[key];
							}.bind(this));

							transaction.executeQuery('update', query, function(err){
								if (err) callback(err);
								else this._saveChildren(transaction, noReload, callback);
							}.bind(this));
						}
						else this._saveChildren(transaction, noReload, callback);
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

									this._saveChildren(transaction, noReload, callback);
								}
								else throw new Error('not implemented!');
							}
						}.bind(this));
					}
				}
			}.bind(this));

			




			/*
			this._saveChildren(connection, noReload, function(err){
				if (err) callback(err);
				else {

				}
			}.bind(this));
			*/

			// insert or update?
			
		}



		, _saveChildren: function(transaction, noReload, callback) {
			async.wait(function(done) {
				this._saveMappings(transaction, noReload, done);
			}.bind(this)
			, function(done) {
				this._saveBelongsTo(transaction, noReload, done);
			}.bind(this), callback);
		}



		, _saveBelongsTo: function(transaction, noReload, callback) {
			async.each(Object.keys(this._belongsTo), function(belongsToId, next){
				this._belongsTo[belongsToId].save(transaction, noReload, next);
			}.bind(this), callback);
		}



		, _saveMappings: function(transaction, noReload, callback) {
			async.each(Object.keys(this._mappings), function(mappingId, next){
				this._mappings[mappingId].save(transaction, noReload, next);
			}.bind(this), callback);
		}




		, _saveReferences: function(transaction, noReload, callback) {
			async.each(this._changedReferences, function(key, next){
				var   value  = this._references[key]
					, column = this._columns[key].column;


				// a query was set as reference
				if (value.isQuery) {
					value.limit(1);

					value.findOne(function(err, model) {
						if (err) next(err);
						else if (!model) {
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
					else value._save(transaction, noReload, function(err){
						if (err) next(err);
						else {
							this[column.name] = value[column.referencedColumn];
							next();
						}
					}.bind(this));
				}
			}.bind(this), callback);
		}
	});
}();
