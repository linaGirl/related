!function(){

	var   Class 		= require('ee-class')
		, EventEmitter 	= require('ee-event-emitter')
		, log 			= require('ee-log');


	module.exports = new Class({
		inherits: EventEmitter

		, init: function(options) {
			this._setProrperty('_defintion', options.definition);
			this._setProrperty('_orm', options.orm);

			// remove deprecated parent property
			delete this.parent;

			
			this._setProrperty('_values', {});
			this._setProrperty('_changedValues', []);

			this._initializeModel();
			this._setValues(options.parameters);
		}

		, _setValues: function(values){

			Object.keys(values).forEach(function(property){
				if (property === '____id____') this._setProrperty('mappingId', values[property]);
				else this._values[property] = values[property];
			}.bind(this));
		}

		, _setProrperty: function(name, value){
			Object.defineProperty(this, name, {value: value});
		}


		, _initializeModel: function(){
			Object.keys(this._defintion.columns).forEach(function(column){
				Object.defineProperty(this, column, {
					set: function(value){
						if (this._values[column] !== value) this._changedValues.push(column);
						this._values[column] = value;
					}
					, get: function(){
						return this._values[column];
					}
					, enumerable: true
				});
			}.bind(this));
		}


		, loadAll: function(callback){
			this.reload(callback);
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

			this._orm._db.query(query, function(err, data){
				if (err) callback(err);
				else {
					if (!data.length) callback(new Error('Failed to load data from database, record doesn\'t exist anymore!'));
					else {
						this._setValues(data[0]);
						callback();
					}
				}
			}.bind(this));
		}


		, save: function(callback){
			if (this._changedValues.length) {

			}	
			else callback();
		}
	});
}();
