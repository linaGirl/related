!function(){

	var   Class 		= require('ee-class')
		, EventEmitter 	= require('ee-event-emitter')
		, log 			= require('ee-log')
		, clone 		= require('clone')
		, args 			= require('ee-arguments')
		, type 			= require('ee-types')
		, Set 			= require('./Set')
		, Query 		= require('./Query')
		, Resource 		= require('./Resource')
		, JoinStatement = require('./JoinStatement')
		, QueryCompiler = require('./QueryCompiler')
		, ORM;





	var QueryBuilder = {


		isQuery: true


		, init: function(options) {
			// remove deprecated parent property (ee-class implementation)
			delete this.parent;

			// load circular depency if not alread loaded
			if (!ORM) ORM = require('./ORM');


			// this will give us acces to the orm, the querybuilders and the 
			// table definition, this method is set by the exported class below
			this._setProperties();


			// the mapping that us got here
			this._setProperty('_mapping', options.mapping);


			// we need to access this properts often
			this.tableName = this._definition.getTableName();
			this.databaseName = this._definition.getDatabaseName();


			// subjoins used for eager loading
			this._setProperty('_joins', options.joins || []);


			// set or define the root resource
			if (options.rootResource) this._setProperty('_rootResource', options.rootResource);
			else {
				this._setProperty('_rootResource', new Resource({
					  Model 			: this._orm[this.databaseName][this.tableName]
					, name 				: this.tableName
					, primaryKeys 		: this._definition.primaryKeys
					, rootFiltered		: true
					, query 			: new Query({
						  from: 	this.tableName
						, database: this.databaseName
					})
				}));
			}


			// the query we're currently working on
			this._setProperty('_resource', options.resource || this._rootResource);


			// parse passed parameters (happens only on the root of the query)
			if (options.parameters) {
				this._parseFilter(this._resource.query, this.tableName, this._getFilters(options.parameters));
				this._parseSelect(this._resource.query, this.tableName, this._getSelect(options.parameters));
			}
		}



		/**
		 * the _handleReference method is called when the user selects 
		 * a referenced subresource on the querybuilder
		 * 
		 * column 			<Object> 	definition of the column of this  
		 * 				   				table which refrences the other table
		 * targetModel 		<Object> 	definition of the targeted model of 
		 * 								the reference
		 * queryParameters 	<Array> 	parameters passed like the filter & 
		 * 								selcet statements
		 * returnTarget 	<Boolean> 	optional, if we're returning the reference
		 * 								for this model or the reference of the
		 * 								targeted model
		 */
		, _handleReference: function(column, targetModel, queryParameters, returnTarget){
			var   select 			= this._getSelect(queryParameters)
				, filter 			= this._getFilters(queryParameters)
				, targetModelName 	= targetModel.name
				, group 			= []
				, resource
				, joins;

			// create basic join definition, it will be converted to more specific join
			// statetments later on
			joins = [new JoinStatement({
				source : {
				  	  table 	: column.referencedTable
				  	, column 	: column.referencedColumn
				} 
				, target: {
					  table 	: this.tableName
				  	, column 	: column.name
				}
			})];


			targetModel.primaryKeys.forEach(function(key){
				group.push({
					  table 	: targetModelName
					, column 	: key
				});
			});



			// create a child tree node for the querybuilder
			resource = new Resource({
				  name 						: targetModelName
				, selected 					: !!Object.keys(select).length
				, parentResource 			: this._resource
				, Model 					: this._orm[this.databaseName][targetModelName]
				, referencedParentColumn	: column.name
				, referencedParentTable 	: this.tableName
				, joins 					: joins
				, filters  					: filter
				, rootResource 				: this._rootResource
				, primaryKeys 				: targetModel.primaryKeys
				, type 						: 'reference'
				, loaderId 					: column.name
				, query 					: new Query({
					  join  				: joins.concat(this._joins)
					, database   			: this.databaseName
					, from 					: targetModelName
					, filter 				: clone(this._resource.query.filter)
					, group 				: group 
				})
			});



			// add primary keys to default seleczt
			targetModel.primaryKeys.forEach(function(key){resource.defaultSelect.push(key);});

			// process options / select on subquery
			this._parseSelect(resource.query, targetModelName, select);

			// store the subquery on the current query
			this._resource.children.push(resource);


			// we may stay at the same level (e.g. fetchModel vs. getModel)
			if (returnTarget) {
				return new this._queryBuilders[targetModelName]({
					  resource 		: resource
					, rootResource 	: this._rootResource
					, joins 		: joins.concat(this._joins)
				});
			}
			else {
				return this;
			}	
		}




		, _handleBelongsTo: function(column, targetModel, queryParameters, returnTarget) {
			var   select 			= this._getSelect(queryParameters)
				, filter 			= this._getFilters(queryParameters)
				, targetModelName 	= targetModel.model.name
				, group 			= []
				, resource
				, joins;

			// create basic join definition, it will be converted to more specific join
			// statetments later on
			joins = [new JoinStatement({
				source : {
				  	  table 	: targetModel.model.name
				  	, column 	: targetModel.targetColumn
				} 
				, target: {
					  table 	: this.tableName
				  	, column 	: column.name
				}
			})];


			targetModel.model.primaryKeys.forEach(function(key){
				group.push({
					  table 	: targetModelName
					, column 	: key
				});
			});
			


			// create a child tree node for the querybuilder
			resource = new Resource({
				  name 						: targetModelName
				, selected 					: !!Object.keys(select).length
				, parentResource 			: this._resource
				, Model 					: this._orm[this.databaseName][targetModelName]
				, referencedParentColumn	: column.name
				, referencedParentTable 	: this.tableName
				, joins 					: joins
				, filters  					: filter
				, rootResource 				: this._rootResource
				, primaryKeys 				: targetModel.model.primaryKeys
				, type 						: 'belongsTo'
				, loaderId 					: targetModel.model.name
				, query 					: new Query({
					  join  				: joins.concat(this._joins)
					, database   			: this.databaseName
					, from 					: targetModelName
					, filter 				: clone(this._resource.query.filter)
					, group 				: group
				})
			});



			// add primary keys to default seleczt
			targetModel.model.primaryKeys.forEach(function(key){resource.defaultSelect.push(key);});

			// process options / select on subquery
			this._parseSelect(resource.query, targetModelName, select);

			// store the subquery on the current query
			this._resource.children.push(resource);



			// we may stay at the same level (e.g. fetchModel vs. getModel)
			if (returnTarget) {
				return new this._queryBuilders[targetModelName]({
					  resource 		: resource
					, rootResource 	: this._rootResource
					, joins 		: joins.concat(this._joins)
				});
			}
			else {
				return this;
			}	
		}



		/*
		 * the _handleMapping method builds the queries for a mapping
		 *
		 * @param <String> the name of the column on our side of the mapping
		 * @param <Object> the definition of the targeted table of the mapping
		 * @param <Array> the parameters passed as filter / select / options for the mapping
		 * @param <Boolean> wheter to return a querybuilder instance on the targeted table
		 * 					of the paping or to stay on the same querybuilder
		 */
		, _handleMapping: function(column, targetModel, queryParameters, returnTarget){
			var   select 			= this._getSelect(queryParameters)
				, filter 			= this._getFilters(queryParameters)
				, targetModelName 	= targetModel.name
				, group 			= []
				, resource
				, joins;

			// create basic join definition, it will be converted to more specific join
			// statetments later on
			joins = [new JoinStatement({
				source : {
					  table 	: targetModel.model.name
				  	, column 	: targetModel.column.name
				} 
				, target: {
				  	  table 	: targetModel.via.model.name
				  	, column 	: targetModel.via.otherFk
				}
			}), new JoinStatement({
				source : {
					  table 	: targetModel.via.model.name
				  	, column 	: targetModel.via.fk				  	
				} 
				, target: {  
					  table 	: this.tableName
				  	, column 	: column.name
				}
			})];


			// group by pk of taarget and by pk of the parent model (this model)
			targetModel.model.primaryKeys.forEach(function(key){
				group.push({
					  table 	: targetModel.model.name
					, column 	: key
				});
			}.bind(this));

			//log(this._definition);
			this._definition.primaryKeys.forEach(function(key){
				group.push({
					  table 	: this.tableName
					, column 	: key
				});
			}.bind(this));



			// create a child tree node for the querybuilder
			resource = new Resource({
				  name 						: targetModelName
				, selected 					: !!Object.keys(select).length
				, parentResource 			: this._resource
				, Model 					: this._orm[this.databaseName][targetModel.model.name]
				, referencedParentColumn	: column.name
				, referencedParentTable 	: this.tableName
				, joins 					: joins
				, filters  					: filter
				, rootResource 				: this._rootResource
				, primaryKeys 				: targetModel.model.primaryKeys
				, type 						: 'mapping'
				, loaderId 					: targetModel.via.model.name
				, query 					: new Query({
					  join  				: joins.concat(this._joins)
					, database   			: this.databaseName
					, from 					: targetModel.model.name
					, filter 				: clone(this._resource.query.filter)
					, group 				: group
				})
			});


			// add primary keys to default seleczt
			targetModel.model.primaryKeys.forEach(function(key){resource.defaultSelect.push(key);});

			// process options / select on subquery
			this._parseSelect(resource.query, targetModel.model.name, select);

			// store the subquery on the current query
			this._resource.children.push(resource);



			// we may stay at the same level (e.g. fetchModel vs. getModel)
			if (returnTarget) {
				return new this._queryBuilders[targetModel.model.name]({
					  resource 		: resource
					, rootResource 	: this._rootResource
					, joins 		: joins.concat(this._joins)
				});
			}
			else {
				return this;
			}				
		}



		, _getFilters: function(parameters) {
			return args(parameters, 'object', {});
		}

		, _getSelect: function(parameters) {
			var stringSelect = args(parameters, 'string');
			return args(parameters, 'array', (stringSelect? [stringSelect] : []));
		}

		, _getOptions: function(parameters) {
			return args(parameters, 'object', {}, 1);
		}


		, _parseFilter: function(query, tablename, filter) {
			Object.keys(filter).forEach(function(property){
				if (!query.filter[tablename]) query.filter[tablename] = {};
				query.filter[tablename][property] = filter[property];
			}.bind(this));
		}

		, _parseSelect: function(query, tablename, select) {
			select.forEach(function(item){
				query.select.push(item);
			}.bind(this));
		}



		, limit: function(limit) {
			if (type.number(limit)) this._resource.query.limit = limit;
			return this;
		}

		, offset: function(offset) {
			if (type.number(offset)) this._resource.query.offset = offset;
			return this;
		}


		, filter: function(filter) {
			this._resource.query.filter = filter;
			//this._parseFilter(this._resource.query, this.tableName, options);
			return this;
		}


		, _addPrimarySelect: function() {
			if (this._rootResource.query.select.length) {
				this._definition.primaryKeys.forEach(function(key){
					this._rootResource.query.select.push(key);
				}.bind(this));
			}
		}



		, find: function(callback) {
			this._addPrimarySelect();

			new QueryCompiler({
				  orm 				: this._orm
				, getDatabase 		: this._getDatabase
				, resource 			: this._rootResource
			}).find(callback);
		}


		, findOne: function(callback) {
			this._addPrimarySelect();

			new QueryCompiler({
				  orm 				: this._orm
				, getDatabase 		: this._getDatabase
				, resource 			: this._rootResource
			}).findOne(callback);
		}


		, delete: function(callback) {
			new QueryCompiler({
				  orm 				: this._orm
				, getDatabase 		: this._getDatabase
				, resource 			: this._rootResource
			}).delete(callback);
		}



		, _setProperty: function(name, value) {
			Object.defineProperty(this, name, {value:value});
		}
	};







	// initialize the querybuilder for the specific model
	module.exports = new Class({

		init: function(options) {
			var   QB = {}
				, mappingMap = {}
				, belongsToMap = {}
				, referenceMap = {}
				, description = {}
				, accessorMap = {
					  get: {}
					, fetch: {}
				};


			QB._setProperties = function(){
				this._setProperty('_queryBuilders', options.queryBuilders);
				this._setProperty('_definition', options.definition);
				this._setProperty('_orm', options.orm);
				this._setProperty('_getDatabase', options.getDatabase);
			}

	
			// clone class
			Object.keys(QueryBuilder).forEach(function (key) {
				QB[key] = QueryBuilder[key];
			}.bind(this));


			// create accessor methods
			Object.keys(options.definition.columns).forEach(function (columnName) {
				var column = options.definition.columns[columnName]
					, id;

				// mappin grelations
				if (column.mapsTo.length) {
					column.mapsTo.filter(function(target){
						// store reference into map for generic methods
						mappingMap[target.via.model.name] = {
							  column: column
							, target: target
						};

						// filter thoose which must be accessed via the generic accessor
						return !target.useGenericAccessor; 
					}).forEach(function(target){
						accessorMap.get[target.name] = function() {
							return this._handleMapping(column, target, Array.prototype.slice.call(arguments), true);
						};
						accessorMap.fetch[target.name] = function() {
							return this._handleMapping(column, target, Array.prototype.slice.call(arguments));
						};

						description[this._getAccessorName(target.name)] = 'Mapping accessor for the «'+target.name+'» Model';
						description[this._getAccessorName(target.name, true)] = 'Mapping accessor for the «'+target.name+'» Model';

						//log.warn(definition.name, column.name, target.model.name, this.mapperGetterName(target.model.name), target.via.model.name);
						Object.defineProperty(QB, this._getAccessorName(target.name), {
							  value 		: accessorMap.get[target.name]
							, enumerable 	: true
						});

						Object.defineProperty(QB, this._getAccessorName(target.name, true), {
							  value 		: accessorMap.fetch[target.name]
							, enumerable 	: true
						});
					}.bind(this));
				}

				// reference
				if (column.referencedModel) {
					referenceMap[column.name] = {
						  column: column
						, target: column.referencedModel
					};

					if (!column.useGenericAccessor) {
						accessorMap.get[column.referencedModel.name] = function() {
							return this._handleReference(column, column.referencedModel, Array.prototype.slice.call(arguments));
						};
						accessorMap.fetch[column.referencedModel.name] = function() {
							return this._handleReference(column, column.referencedModel, Array.prototype.slice.call(arguments), true);
						};

						description[this._getAccessorName(column.referencedModel.name)] = 'Reference accessor for the «'+column.referencedModel.name+'» Model';
						description[this._getAccessorName(column.referencedModel.name, true)] = 'Reference accessor for the «'+column.referencedModel.name+'» Model';

						QB[this._getAccessorName(column.referencedModel.name, true)] = accessorMap.get[column.referencedModel.name];
						QB[this._getAccessorName(column.referencedModel.name)] = accessorMap.fetch[column.referencedModel.name];

					}
				}

				// belongs to
				if (column.belongsTo.length) {
					column.belongsTo.filter(function(target){
						// store reference into map for generic methods
						belongsToMap[target.model.name] = {
							  column: column
							, target: target
						};

						// filter thoose which must be accessed via the generic accessor
						return !target.useGenericAccessor; 
					}).forEach(function(target){
						//log.warn(definition.name, column.name, target.name, this.mapperGetterName(target.name));
						accessorMap.get[target.name] = function() {
							return this._handleBelongsTo(column, target, Array.prototype.slice.call(arguments));
						};
						accessorMap.fetch[target.name] = function() {
							return this._handleBelongsTo(column, target, Array.prototype.slice.call(arguments), true);
						};

						description[this._getAccessorName(target.name)] = 'Belongs to accessor for the «'+target.name+'» Model';
						description[this._getAccessorName(target.name, true)] = 'Belongs to accessor for the «'+target.name+'» Model';


						QB[this._getAccessorName(target.name, true)] = accessorMap.get[target.name];
						QB[this._getAccessorName(target.name)] = accessorMap.fetch[target.name];

					}.bind(this));
				}
			}.bind(this));
	

			// generic accessor for everything
			Object.defineProperty(QB, 'get', {
				value: function(targetName) {
					if (Object.hasOwnProperty.call(accessorMap.get, targetName)) {
						return accessorMap.get[targetName].apply(this, Array.prototype.slice.call(arguments, 1));
					}
					else throw new Error('The QueryBuilder has no property «'+targetName+'»!');	
				}
				, enumerable: true
			});

			Object.defineProperty(QB, 'fetch', {
				value: function(targetName) {
					if (Object.hasOwnProperty.call(accessorMap.fetch, targetName)) {
						return accessorMap.fetch[targetName].apply(this, Array.prototype.slice.call(arguments, 1));
					}
					else throw new Error('The QueryBuilder has no property «'+targetName+'»!');	
				}
				, enumerable: true
			});

				
			// generic accessors for mappings
			Object.defineProperty(QB, 'getMapping', {
				value: function(mappingTableName) {
					var info = mappingMap[mappingTableName];
					if (info) return this._handleMapping(info.column, info.target, Array.prototype.slice.call(arguments, 1), true);
					else throw new Error('Unknown mapping «'+mappingTableName+'» on entity «'+options.definition.name+'»!');					
				}
				, enumerable: true
			});
			Object.defineProperty(QB, 'fetchMapping', {
				value: function(mappingTableName) {
					var info = mappingMap[mappingTableName];
					if (info) return this._handleMapping(info.column, info.target, Array.prototype.slice.call(arguments, 1));
					else throw new Error('Unknown mapping «'+mappingTableName+'» on entity «'+options.definition.name+'»!');			
				}
				, enumerable: true
			});

			// generic accessors for references
			Object.defineProperty(QB, 'getReference', {
				value: function(referencedTable) {
					var info = referenceMap[referencedTable];
					if (info) return this._handleReference(info.column, info.target, Array.prototype.slice.call(arguments, 1), true);
					else throw new Error('Unknown reference «'+referencedTable+'» on entity «'+options.definition.name+'»!');					
				}
				, enumerable: true
			});
			Object.defineProperty(QB, 'fetchReference', {
				value: function(referencedTable) {
					var info = referenceMap[referencedTable];
					if (info) return this._handleReference(info.column, info.target, Array.prototype.slice.call(arguments, 1));
					else throw new Error('Unknown reference «'+referencedTable+'» on entity «'+options.definition.name+'»!');			
				}
				, enumerable: true
			});

			// generic accessors for belongsto
			Object.defineProperty(QB, 'getBelongsTo', {
				value: function(belongingTableName) {
					var info = belongsToMap[belongingTableName];
					if (info) return this._handleBelongsTo(info.column, info.target, Array.prototype.slice.call(arguments, 1), true);
					else throw new Error('Unknown belongstTo «'+mappingTableName+'» on entity «'+options.definition.name+'»!');					
				}
				, enumerable: true
			});
			Object.defineProperty(QB, 'fetchBelongsTo', {
				value: function(belongingTableName) {
					var info = belongsToMap[belongingTableName];
					if (info) return this._handleBelongsTo(info.column, info.target, Array.prototype.slice.call(arguments, 1));
					else throw new Error('Unknown belongstTo «'+mappingTableName+'» on entity «'+options.definition.name+'»!');			
				}
				, enumerable: true
			});



			// describe methods function
			Object.defineProperty(QB, 'describeMethods', {
				value: function() {
					log(description);
					return this;
				}
				, enumerable: true
			});
	
	
			return new Class(QB);
		}


		, _getAccessorName: function(id, useFetch) {
			return (useFetch ? 'fetch' : 'get') + id[0].toUpperCase()+id.slice(1);
		}
	});
}();
