!function(){

	var   Class 		= require('ee-class')
		, EventEmitter 	= require('ee-event-emitter')
		, QueryBuilder 	= require('./QueryBuilder')
		, DefaultModel 	= require('./DefaultModel')
		, RelatingSet 	= require('./RelatingSet')
		, clone 		= require('clone')
		, log 			= require('ee-log');



	// model initializer
	module.exports = new Class({


		init: function(_options){
			var that = this;

			this._definition = _options.definition;
			this._options = _options;
			this._orm = _options.orm;

			// add properties for this specific model
			this.Model = this.createModel(DefaultModel, _options);

			this.QueryBuilder = new QueryBuilder({
				  orm 				: _options.orm
				, queryBuilders 	: _options.queryBuilders
				, definition 		: _options.definition
				, getDatabase 		: _options.getDatabase
			});


			_options.queryBuilders[_options.definition.getTableName()] = this.QueryBuilder;


			// constructor to expose
			var Constructor = function(options, relatingSets) {

				if (this instanceof Constructor) {

					// new model instance
					var instance = new that.Model({
						  parameters 		: options
						, orm 				: _options.orm
						, definition 		: _options.definition
						, isFromDB 			: options && options._isFromDB
						, relatingSets 		: relatingSets
						, getDatabase 		: _options.getDatabase
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
					var qb = new that.QueryBuilder({
						parameters: Array.prototype.slice.call(arguments)
					});

					// call the specific method on the querybuilder
					// qb[_options.definition.getTableName()].apply(qb, Array.prototype.slice.call(arguments));

					return qb;
				}
			};

			// the constructor implements the event interface
			// the events are global listeners for all model instances
			//Constructor.__proto__ = new EventEmitter();


			// the model definition must be accesible publicly
			Constructor.definition = _options.definition;

			// expose if its a mapping table
			if (this._definition.isMapping) Constructor.isMapping = true;

			// let the user define accessornames
			Constructor.setMappingAccessorName = this.setMappingAccessorName.bind(this);
			Constructor.setReferenceAccessorName = this.setReferenceAccessorName.bind(this);

			Constructor.getDefinition = this.getDefinition.bind(this);

			return Constructor;
		}


		, getDefinition: function() {
			return this._definition;
		}


		, setMappingAccessorName: function(mappingName, name) {
			if (!this.Model[name]) {
				this._mappingMap[mappingName].definition.name = this._orm._getPluralAccessorName(name);
				this._mappingMap[mappingName].definition.useGenericAccessor = false;
				this.Model = this.createModel(DefaultModel, this._options);				
			}
			else throw new Error('The mapping accessor «'+name+'» on the model «'+this._model.name+'» is already in use!');
		}


		, _createMappingGetter: function(mappingName, options) {			
			return {
				  enumerable: true
				, get: function() {
					// create referencing set only when used
					if (!this._mappings[mappingName]) {
						this._mappings[mappingName] = new RelatingSet({
							  orm: 			options.orm
							, definition: 	options.definition
							, column: 		options.column
							, related: 		this
							, database: 	options.databaseName
							, isMapping: 	true
						});
					}

					this._mappings[mappingName].on('change', function(){
						this._setChanged();
					}.bind(this));

					return this._mappings[mappingName];
				}
			};
		}



		, setReferenceAccessorName: function(referenceName, name) {
			if (!this.Model[name]) {
				this._referenceMap[referenceName].aliasName = name;
				this._referenceMap[referenceName].useGenericAccessor = false;
				this.Model = this.createModel(DefaultModel, this._options);						
			}
			else throw new Error('The reference accessor «'+name+'» on the model «'+this._model.name+'» is already in use!');
		}



		, createModel: function(model, options, additionalProperties){
			var   CustomModel 	= clone(model.definition)
				, databaseName 	= this._definition.getDatabaseName()
				, properties 	= additionalProperties || {}
				, mappingMap 	= this._mappingMap = {}
				, belongsToMap 	= this._belongsToMap = {}
				, referenceMap 	= this._referenceMap = {};

			// make sure the instantiated model can get the correct orm instance (support for transactions)
			CustomModel.getDatabase = options.getDatabase;


			properties._columns = {
				value: {}
			};



			// build model
			Object.keys(this._definition.columns).forEach(function(columnName){
				var   column = this._definition.columns[columnName]
				 	, definition = properties[columnName] = {}
				 	, referenceDefinition
				 	, referenceName;


				// mappings
				if (column.mapsTo){
					column.mapsTo.filter(function(mapping){
						mappingMap[mapping.via.model.name] = {
							  column: column
							, definition: mapping
						};

						return !mapping.useGenericAccessor;
					}).forEach(function(mapping){
						var mappingName = mapping.via.model.name;

						properties._columns.value[mappingName] = {
							  type 	 	: 'mapping'
							, column 	: column
						};

						properties[mapping.name] = this._createMappingGetter(mappingName, {
							  orm: 			options.orm
							, definition: 	mapping
							, column: 		column
							, database: 	databaseName
						});
					}.bind(this));
				}

				// belongs to
				if (column.belongsTo){
					column.belongsTo.filter(function(belongs){
						belongsToMap[belongs.model.name] = {
							  column: column
							, definition: belongs
						};

						return !belongs.useGenericAccessor;
					}).forEach(function(belongs){
						var relationName = belongs.model.name;

						properties._columns.value[relationName] = {
							  type 	 	: 'belongsTo'
							, column 	: column
						};

						properties[belongs.name] = {
							  enumerable: true
							, get: function() {
								// create referencing set only when used
								if (!this._belongsTo[relationName]) {
									this._belongsTo[relationName] = new RelatingSet({
										  orm: 			options.orm
										, definition: 	belongs
										, column: 		column
										, related: 		this
										, database: 	databaseName
										, isMapping: 	false
									});

									this._belongsTo[relationName].on('chnage', function(){
										this._setChanged();
									}.bind(this));
								}

								return this._belongsTo[relationName];
							}
						};
					}.bind(this));
				}

				// references
				if (column.referencedModel) {
					referenceMap[column.name] = column;

					if (!column.useGenericAccessor) {
						referenceName = column.aliasName || column.referencedModel.name;
						referenceDefinition = properties[referenceName] = {enumerable: true};

						properties._columns.value[referenceName] = {
							  type 	 	: 'reference'
							, column 	: column
						};

						referenceDefinition.get = function(){
							return this._references[referenceName];
						};

						referenceDefinition.set = function(newValue){
							if (this._references[referenceName] !== newValue) {
								this._changedReferences.push(referenceName);
								this._references[referenceName] = newValue;
								this._setChanged();
							}
						};
					}
				}
				else {
					definition.enumerable = true;
					properties._columns.value[columnName] = {
						  type 	 	: 'scalar'
						, column 	: column
					};
				}


				definition.get = function(){
					return this._values[columnName];
				};

				definition.set = function(value){
					if (this._values[columnName] !== value) {
						this._changedValues.push(columnName);
						this._values[columnName] = value;
						this._setChanged();
					}
				};		
			}.bind(this));



			// generic belongsTo, mapping, refernce accessor
			properties.get = {
				value: function(targetName) {

				}
			}
	

			// generic accessor method for mappings
			properties.getMapping = {
				value: function(mappingName){
					if (mappingMap[mappingName]) {
						// create referencing set only when used
						if (!this._mappings[mappingName]) {
							this._mappings[mappingName] = new RelatingSet({
								  orm: 			options._orm
								, definition: 	mappingMap[mappingName].definition
								, column: 		mappingMap[mappingName].column
								, related: 		this
								, database: 	databaseName
							});

							this._mappings[mappingName].on('chnage', function(){
								this._setChanged();
							}.bind(this));
						}

						return this._mappings[mappingName];						
					}
					else throw new Error('Mapping via «'+mappingName+'» on entity «'+options.definition.name+'» doesn\'t exist!');
				}
			};

			// generic accessor method for belongTo
			properties.getBelongsTo = {
				value: function(belongingName){
					if (belongsToMap[belongingName]) {
						// create referencing set only when used
						if (!this._belongsTo[belongingName]) {
							this._belongsTo[belongingName] = new RelatingSet({
								  orm: 			options._orm
								, definition: 	belongsToMap[belongingName].definition
								, column: 		belongsToMap[belongingName].column
								, related: 		this
								, database: 	databaseName
							});

							this._belongsTo[belongingName].on('chnage', function(){
								this._setChanged();
							}.bind(this));
						}

						return this._belongsTo[belongingName];						
					}
					else throw new Error('Belongs to «'+belongingName+'» on entity «'+options.definition.name+'» doesn\'t exist!');
				}
			};

			// generic accessor method for belongTo
			properties.getReference = {
				value: function(referenceName){
					if (referenceMap[referenceName]) {						
						return this._references[referenceName];						
					}
					else throw new Error('Reference on «'+referenceName+'» on entity «'+options.definition.name+'» doesn\'t exist!');
				}
			};
			properties.setReference = {
				value: function(referenceName, newReferenceModel, existing){
					if (referenceMap[referenceName]) {
						if (!existing && this._references[referenceName] !== newReferenceModel) {
							this._changedReferences.push(referenceName);	
							this._references[referenceName] = newReferenceModel;
							this._setChanged();
						}
					}
					else throw new Error('Reference on «'+referenceName+'» on entity «'+options.definition.name+'» doesn\'t exist!');
				}
			};

			return new Class(CustomModel, properties);
		}



		, capitalize: function(input) {
			return input[0].toUpperCase() + input.slice(1);
		}
	});
}();
