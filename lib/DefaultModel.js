!function(){

	var   Class 		= require('ee-class')
		, arg 			= require('ee-arguments')
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
			this._setProrperty('_references', {});
			this._setProrperty('_changedReferences', []);
			this._setProrperty('_mappingIds', [], true);
			this._setProrperty('_relatingSets', options.relatingSets);
			
			this._setProrperty('_fromDb', options.isFromDB || false);

			this._initializeRelatingSets(true);

			if (options.parameters) this._setValues(options.parameters);
		}



		, _initializeRelatingSets: function(partial) {

			this._mappings.forEach(function(definition){
				if (!this[definition.mapping.name] && (!partial || this._relatingSets[definition.mapping.name])) {
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
				if (!this[definition.belongs.name] && (!partial || this._relatingSets[definition.belongs.name])) {
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



		, prepare: function() {
			this._initializeRelatingSets();
			return this;
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


		, save: function(callback){
			var   callback = arg(arguments, 'function', function(){})
				, noReload = arg(arguments, 'boolean', false)
				, query = {
				      from 	 	: this._defintion.getTableName()
					, database 	: this._defintion.getDatabaseName()
					, filter	: {}
					, values 	: this._fromDb ? this._getChangedValues() : this._values
			};


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

			return this;
		}
	});
}();
