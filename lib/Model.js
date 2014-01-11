!function(){

	var   Class 		= require('ee-class')
		, EventEmitter 	= require('ee-event-emitter')
		, log 			= require('ee-log');


	var model = {
		inherits: EventEmitter

		, init: function(options) {
			// remove deprecated parent property
			delete this.parent;

			this._setProrperty('_orm', options.orm);
			this._setProrperty('_definition', options.definition);

			this._setValues(options.parameters);
			
		}

		, _setValues: function(values){
			this._setProrperty('_values', {});
			this._setProrperty('_changedValues', []);

			Object.keys(values).forEach(function(property){
				this[property] = values[property];
			}.bind(this));
		}

		, _setProrperty: function(name, value){
			Object.defineProperty(this, name, {value: value});
		}
	};




	// model initializer
	module.exports = new Class({


		modelEvents: {}


		, init: function(_options){
			this._definition = _options.definition;

			// add properties for this specific model
			var Model = this.createModel();


			// constructor to expose
			var Constructor = function(options) {
				if (this instanceof Constructor) {

					// new model instance
					var instance = new Model({
						  orm: 			_options.orm
						, definition: 	_options.definition
						, parameters: 	options
					});

					// clone events from global model
					if (this.$$$$_events) {
						Object.keys(this.$$$$_events).forEach(function(event){
							this.$$$$_events[event].forEach(function(listener){
								if (!instance.$$$$_events[event]) nstance.$$$$_events[event] = [];
								instance.$$$$_events[event].push(listener);
							});
						});
					}

					return instance;
				}
				else {
					// return a querybuilder
					var qb = new _options.QueryBuilder({
						  orm: 			_options.orm
						, definition: 	_options.definition
					});

					// call the specific method on the querybuilder
					qb[_options.definition.getTableName()].apply(qb, Array.prototype.slice.call(arguments));

					return qb;
				}
			};

			// the constructor implements the event interface
			// the events are global listeners for all model instances
			Constructor.__proto__ = new EventEmitter();


			// the model definition must be accesible publicly
			Constructor.definition = _options.definition;


			return Constructor;
		}




		, createModel: function(){
			var Model = {};

			Object.keys(model).forEach(function(key){
				Model[key] = model[key];
			}.bind(this));

			Object.keys(this._definition).forEach(function(property){
				Model['get '+property] = function(){
					return this._values[property];
				}
				Model['set '+property] = function(value){
					if (this._values[property] !== value) this._changedValues.push(property);
					this._values[property] = value;
				}
			}.bind(this));

			return new Class(Model);
		}
	});
}();
