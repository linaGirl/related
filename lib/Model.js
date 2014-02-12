!function(){

	var   Class 		= require('ee-class')
		, EventEmitter 	= require('ee-event-emitter')
		, QueryBuilder 	= require('./QueryBuilder')
		, DefaultModel 	= require('./DefaultModel')
		, clone 		= require('clone')
		, log 			= require('ee-log');



	// model initializer
	module.exports = new Class({


		init: function(_options){
			this._definition = _options.definition;

			// add properties for this specific model
			var   Model 	= this.createModel(DefaultModel, _options)
				, QB 		= new QueryBuilder(_options.orm, _options.queryBuilders, _options.definition);


			_options.queryBuilders[_options.definition.getTableName()] = QB;


			// constructor to expose
			var Constructor = function(options) {

				if (this instanceof Constructor) {

					// new model instance
					var instance = new Model({
						  parameters: 	options
						, orm: 			_options.orm
						, definition: 	_options.definition
						, isFromDB: 	options._isFromDB
					});

					// clone events from global model
					/*if (this.$$$$_events) {
						Object.keys(this.$$$$_events).forEach(function(event){
							this.$$$$_events[event].forEach(function(listener){
								if (!instance.$$$$_events[event]) nstance.$$$$_events[event] = [];
								instance.$$$$_events[event].push(listener);
							});
						});
					}*/

					return instance;
				}
				else {

					// return a querybuilder
					var qb = new QB({
						  parameters:  	Array.prototype.slice.call(arguments)
					});

					// call the specific method on the querybuilder
					// qb[_options.definition.getTableName()].apply(qb, Array.prototype.slice.call(arguments));

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




		, createModel: function(model, options){
			var   CustomModel 	= clone(model.definition)
				, properties 	= {
					_mappings: { value: [] }
				};



			// build model
			Object.keys(this._definition.columns).forEach(function(columnName){
				var   defintion 			= properties[columnName] = {enumerable: true}
				 	, column 				= this._definition.columns[columnName]
				 	, referenceDefinition
				 	, referenceName;

				defintion.get = function(){
					return this._values[columnName];
				};

				defintion.set = function(value){
					if (this._values[columnName] !== value) this._changedValues.push(columnName);
					this._values[columnName] = value;
				};

				
				// mappings
				if (column.mapsTo){
					column.mapsTo.forEach(function(mapping){
						properties._mappings.value.push({
							  mapping: mapping
							, column: column
						});
					}.bind(this));
				}

				if (column.referencedModel) {
					referenceName = column.referencedModel.name;
					referenceDefinition = properties[referenceName] = {enumerable: true};

					referenceDefinition.get = function(){
						return this._references[referenceName];
					};

					referenceDefinition.set = function(Model){
						if (this._references[referenceName] !== Model) this._changedReferences.push(referenceName);
						this._references[referenceName] = Model;
					};
				}
			}.bind(this));


			return new Class(CustomModel, properties);
		}



		, capitalize: function(input) {
			return input[0].toUpperCase() + input.slice(1);
		}
	});
}();
