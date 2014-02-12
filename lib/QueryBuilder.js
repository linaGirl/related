!function(){

	var   Class 		= require('ee-class')
		, EventEmitter 	= require('ee-event-emitter')
		, log 			= require('ee-log')
		, clone 		= require('clone')
		, args 			= require('ee-arguments')
		, type 			= require('ee-types')
		, async 		= require('ee-async')
		, pluralize 	= require('pluralize')
		, merge 		= require('merge')
		, Set 			= require('./Set')
		, Query 		= require('./Query')
		, Resource 		= require('./Resource')
		, JoinStatement = require('./JoinStatement')
		, QueryCompiler = require('./QueryCompiler')
		, ORM;





	var QueryBuilder = {


		init: function(options) {
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
				, query 					: new Query({
					  join  				: joins.concat(this._joins)
					, database   			: this.databaseName
					, from 					: targetModelName
					, filter 				: clone(this._resource.query.filter)
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
				, type 						: 'reference'
				, query 					: new Query({
					  join  				: joins.concat(this._joins)
					, database   			: this.databaseName
					, from 					: targetModelName
					, filter 				: clone(this._resource.query.filter)
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
				, query 					: new Query({
					  join  				: joins.concat(this._joins)
					, database   			: this.databaseName
					, from 					: targetModel.model.name
					, filter 				: clone(this._resource.query.filter)
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
			this._resource.filter = filter;
			//this._parseFilter(this._resource.query, this.tableName, options);
			return this;
		}



		, find: function(callback) {
			new QueryCompiler({
				  orm 		: this._orm
				, resource 	: this._rootResource
			}).find(callback);
		}



		, _setProperty: function(name, value) {
			Object.defineProperty(this, name, {value:value});
		}
	};







	// initialize the querybuilder for the specific model
	module.exports = new Class({

		init: function(orm, queryBuilders, definition) {
			var QB = {};

			QB._setProperties = function(){
				this._setProperty('_queryBuilders', queryBuilders);
				this._setProperty('_definition', definition);
				this._setProperty('_orm', orm);
			}

			// clone class
			Object.keys(QueryBuilder).forEach(function (key) {
				QB[key] = QueryBuilder[key];
			}.bind(this));


			// create getter mthods
			Object.keys(definition.columns).forEach(function (columnName) {
				var column = definition.columns[columnName]
					, id;

				// mappin grelations
				if (column.mapsTo.length) {
					column.mapsTo.forEach(function(target){
						//log.warn(definition.name, column.name, target.model.name, this.mapperGetterName(target.model.name), target.via.model.name);
						id = this.mapperGetterName(target.model.name);
						
						if (QB[id]) {
							// duplicate id
							if (target.model.name === definition.name) {
								// maps onto self
								id = this.mapperGetterName('other'+target.model.name[0].toUpperCase()+target.model.name.slice(1));
							}
							else throw new Error('Cannot redefine property «'+id+'» for mapping handler from «'+definition.name+'» to «'+target.model.name+'» via «'+target.via.model.name+'», ask eventEmitter to fix this!');
						}

						Object.defineProperty(QB, id, {
							value: function() {
								return this._handleMapping(column, target, Array.prototype.slice.call(arguments), true);
							}
							, enumerable: true
						});


						id = this.mapperGetterName(target.model.name, true);
						if (QB[id]) {
							// duplicate id
							if (target.model.name === definition.name) {
								// maps onto self
								id = this.mapperGetterName('other'+target.model.name[0].toUpperCase()+target.model.name.slice(1), true);
							}
							else throw new Error('Cannot redefine property «'+id+'» for mapping handler from «'+definition.name+'» to «'+target.model.name+'» via «'+target.via.model.name+'», ask eventEmitter to fix this!');
						}
						Object.defineProperty(QB, id, {
							value: function() {
								return this._handleMapping(column, target, Array.prototype.slice.call(arguments));
							}
							, enumerable: true
						});
					}.bind(this));
				}

				// reference
				if (column.referencedModel) {
					QB[this.getterName(column.referencedModel.name)] = function() {
						return this._handleReference(column, column.referencedModel, Array.prototype.slice.call(arguments), true);
					};

					QB[this.getterName(column.referencedModel.name, true)] = function() {
						return this._handleReference(column, column.referencedModel, Array.prototype.slice.call(arguments));
					};
				}

				// belongs to
				if (column.belongsTo.length) {
					column.belongsTo.forEach(function(target){
						//log.warn(definition.name, column.name, target.name, this.mapperGetterName(target.name));

						QB[this.mapperGetterName(target.model.name)] = function() {
							return this._handleBelongsTo(column, target, Array.prototype.slice.call(arguments), true);
						};

						QB[this.mapperGetterName(target.model.name, true)] = function() {
							return this._handleBelongsTo(column, target, Array.prototype.slice.call(arguments));
						};
					}.bind(this));
				}
			}.bind(this));
	
			return new Class(QB);
		}




		, getterName: function(id, fetch) {
			return (fetch ? 'fetch' : 'get') + id[0].toUpperCase()+id.slice(1);
		}

		, mapperGetterName: function(id, fetch) {
			var parts = id.match(/(?:^|[A-Z0-9])[^A-Z0-9]+/g);

			if (parts){
				if (parts.length === 1) id = pluralize.plural(id);
				else id = parts.slice(0, parts.length-1).join('')+pluralize.plural(parts[parts.length-1]);
			}
			else id = pluralize.plural(id);
			
			return (fetch ? 'fetch' : 'get') + id[0].toUpperCase()+id.slice(1);
		}
	});
}();
