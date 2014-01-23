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
			if (options.parameters) this._setValues(options.parameters);

			this._setProrperty('_fromDb', options.isFromDB);
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
			return this.reload(callback);
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
						this._fromDb = true;
						callback();
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
			var query = {
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

					this._orm._db.query('update', query, callback);
				}
				else callback();
			}
			else {
				this._orm._db.query('insert', query, function(err, result){
					if (err) callback(err);
					else {
						if (result.type === 'id'){
							// reload
							this.id = result.id;
							this.reload(callback);
						}
						else throw new Error('not implemented!');
					}
				}.bind(this));
			}

			return this;
		}
	});
}();
