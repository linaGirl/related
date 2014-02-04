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
		, JoinStatement = require('./JoinStatement');




	var QueryBuilder = {


		init: function(options) {
			// remove deprecated parent property (ee-class implementation)
			delete this.parent;


			// this will give us acces to the orm, the querybuilders and the 
			// table definition, this method is set by the exported class below
			this._setProperties();


			// the mapping that us got here
			this._setProperty('_mapping', options.mapping);


			// we need to access this properts often
			this.tableName = this._definition.getTableName();
			this.databaseName = this._definition.getDatabaseName();


			// subjoins used for eager loading
			this._setProperty('_subJoins', options.subJoins || []);

			// set or define the root query

			if (options.rootQuery) this._setProperty('_rootQuery', options.rootQuery);
			else {
				this._setProperty('_rootQuery', new Resource({
					query: new Query({
						  from: 	this.tableName
						, database: this.databaseName
						, group: 	this._definition.primaryKeys
					})
				});
			}


			// the query we're currently working on
			this._setProperty('_query', options.query || this._rootQuery);


			// parse passed parameters (happens only on the root of the query)
			if (options.parameters) {
				this._parseFilter(this._query, this.tableName, options.parameters);
				this._parseOptions(this._query, this.tableName, options.parameters);
				this._parseSelect(this._query, this.tableName, options.parameters);
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
			var   joins = []
				, resource;

			// create basic join definition, it will be converted to more specific join
			// statetments later on
			joins.push(new JoinStatement({
				  ourTableName 		: this.tableName
				, ourColumnName 	: column.name
				, otherTableName 	: column.referencedTable
				, otherColumnName 	: column.referencedColumn
			});


			// create joins for the subqueries
			var subJoins = [{
				  type:  	'inner'
				, source:	this._createJoinObject(column.referencedTable, column.referencedColumn)
				, target: 	this._createJoinObject(this.tableName, columnName)
			}].concat(this._subJoins);



			// define subquery
			subQuery = {
				  attributeName 	: modelDefinition.name
				, selected 			: !!this._getSelect(queryParameters).length
				, column 			: this._definition.primaryKeys[0]
				, table 			: this.tableName
				, Model 			: this._orm[this.databaseName][modelDefinition.name]
				, rootJoins 		: [join]
				, hasFilter 		: !!this._getFilters(queryParameters).length
				, parent 			: this._query
				, query: new Query({
					  join 			: subJoins
					, database 		: this.databaseName
					, from 			: modelDefinition.name
					, subresources 	: []
					, filter 		: clone(this._query.filter)
					, select : [
					 function(){
					  	return {
						  	  table 	: this.tableName
						  	, column 	: this._definition.primaryKeys[0]
						  	, alias 	: '____id____'
						}					
					}.bind(this)]
				})
			};

			// add primary keys to select
			modelDefinition.primaryKeys.forEach(function(key){
				subQuery.query.select.push(key);
			});

			// process filters on the root query
			this._parseFilter(this._rootQuery, modelDefinition.name, queryParameters);

			// process options / select on subquery
			this._parseSelect(subQuery.query, modelDefinition.name, queryParameters);
			this._parseOptions(subQuery.query, modelDefinition.name, queryParameters);

			// store the subquery on the current query
			this._query.subresources.push(subQuery);


			// we may stay at the same level (e.g. fetchModel vs. getModel)
			if (returnTarget) {
				return new this._queryBuilders[modelDefinition.name]({
					  query 		: subQuery.query
					, rootQuery 	: this._rootQuery
					, subJoins 		: clone(subJoins)
				});
			}
			else {
				return this;
			}	
		}




		, _handleBelongsTo: function(columnName, modelDefinition, queryParameters, returnTarget) {
			var   column = this._definition.columns[columnName]
				, subQuery
				, join;


			// add join statements to the current query
			join = {
				  type 		: 'inner'
				, source 	: this._createJoinObject(this.tableName, columnName)
				, target 	: this._createJoinObject(modelDefinition.model.name, modelDefinition.targetColumn)
			}


			// create joins for the subqueries
			var subJoins = [{
				  type:  	'inner'
				, source:	this._createJoinObject(modelDefinition.model.name, modelDefinition.targetColumn)
				, target: 	this._createJoinObject(this.tableName, columnName)
			}].concat(this._subJoins);



			// define subquery
			subQuery = {
				  attributeName 	: modelDefinition.model.name
				, selected 			: !!this._getSelect(queryParameters).length
				, column 			: this._definition.primaryKeys[0]
				, table 			: this.tableName
				, Model 			: this._orm[this.databaseName][modelDefinition.model.name]
				, rootJoins 		: [join]
				, hasFilter 		: !!this._getFilters(queryParameters).length
				, parent 			: this._query
				, query: new Query({
					  join 			: subJoins
					, database 		: this.databaseName
					, from 			: modelDefinition.model.name
					, subresources 	: []
					, filter 		: clone(this._query.filter)
					, select : [
					 function(){
					  	return {
						  	  table 	: this.tableName
						  	, column 	: this._definition.primaryKeys[0]
						  	, alias 	: '____id____'
						}					
					}.bind(this)]
				})
			};

			// add primary keys to select
			modelDefinition.model.primaryKeys.forEach(function(key){
				subQuery.query.select.push(key);
			});

			// process filters on the root query
			this._parseFilter(this._rootQuery, modelDefinition.model.name, queryParameters);

			// process options / select on subquery
			this._parseSelect(subQuery.query, modelDefinition.model.name, queryParameters);
			this._parseOptions(subQuery.query, modelDefinition.model.name, queryParameters);

			// store the subquery on the current query
			this._query.subresources.push(subQuery);


			// we may stay at the same level (e.g. fetchModel vs. getModel)
			if (returnTarget) {
				return new this._queryBuilders[modelDefinition.model.name]({
					  query 		: subQuery.query
					, rootQuery 	: this._rootQuery
					, subJoins 		: clone(subJoins)
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
		, _handleMapping: function(columnName, mappingTargetDefinition, queryParameters, returnTarget){
			var   column
				, subQuery
				, joinA
				, joinB;


			// the definition of our column
			column = this._definition.columns[columnName];


			// add join statements to the current query
			joinA = {
				  type: 'inner'
				, source: this._createJoinObject(this.tableName, column.name)
				, target: this._createJoinObject(mappingTargetDefinition.via.model.name, mappingTargetDefinition.via.fk)
			}
			joinB = {
				  type: 'inner'
				, source: this._createJoinObject(mappingTargetDefinition.via.model.name, mappingTargetDefinition.via.otherFk)
				, target: this._createJoinObject(mappingTargetDefinition.model.name, mappingTargetDefinition.column.name)
			}


			// create joins for the subqueries
			var subJoins = [
				{
					  type:  	'inner'
					, source: 	this._createJoinObject(mappingTargetDefinition.model.name, mappingTargetDefinition.column.name)
					, target: 	this._createJoinObject(mappingTargetDefinition.via.model.name, mappingTargetDefinition.via.otherFk)
				}
				, {
					  type:  	'inner'
					, source:	this._createJoinObject(mappingTargetDefinition.via.model.name, mappingTargetDefinition.via.fk)
					, target: 	this._createJoinObject(this.tableName, column.name)
				}
			].concat(this._subJoins);



			// define subquery
			subQuery = {
				  attributeName 	: mappingTargetDefinition.name
				, isMapping 		: true
				, selected 			: !!this._getSelect(queryParameters).length
				, column 			: column.name
				, table 			: this.tableName
				, Model 			: this._orm[this.databaseName][mappingTargetDefinition.model.name]
				, rootJoins 		: [joinA, joinB]
				, hasFilter 		: !!this._getFilters(queryParameters).length
				, parent 			: this._query
				, query: new Query({
					  join 			: subJoins
					, database 		: this.databaseName
					, from 			: mappingTargetDefinition.model.name
					, subresources 	: []
					, filter 		: clone(this._query.filter)
					, select : [
					 function(){
					  	return {
						  	  table 	: this.tableName
						  	, column 	: column.name
						  	, alias 	: '____id____'
						}					
					}.bind(this)]
				})
			};

			// add primary keys to select
			mappingTargetDefinition.model.primaryKeys.forEach(function(key){
				subQuery.query.select.push(key);
			});

			// process filters on the root query
			this._parseFilter(this._rootQuery, mappingTargetDefinition.model.name, queryParameters);

			// process options / select on subquery
			this._parseSelect(subQuery.query, mappingTargetDefinition.model.name, queryParameters);
			this._parseOptions(subQuery.query, mappingTargetDefinition.model.name, queryParameters);

			// store the subquery on the current query
			this._query.subresources.push(subQuery);

			// we may stay at the same level (e.g. fetchModel vs. getModel)
			if (returnTarget) {
				return new this._queryBuilders[mappingTargetDefinition.model.name]({
					  query 		: subQuery.query
					, rootQuery 	: this._rootQuery
					, subJoins 		: clone(subJoins)
					, mapping 		: mappingTargetDefinition
				});
			}
			else {
				return this;
			}			
		}


		, _createJoinObject: function(table, column){
			return {
				  table 	: table
				, column 	: column
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

		, _parseFilter: function(query, tablename, parameters) {
			var filter = this._getFilters(parameters);

			Object.keys(filter).forEach(function(property){
				if (!query.filter[tablename]) query.filter[tablename] = {};
				query.filter[tablename][property] = filter[property];
			}.bind(this));
		}

		, _parseSelect: function(query, tablename, parameters) {
			var select = this._getSelect(parameters);

			select.forEach(function(item){
				query.select.push(item);
			}.bind(this));
		}

		, _parseOptions: function(query, tablename, parameters) {
			var options = this._getOptions(parameters);
			if (type.number(options.limit)) query.limit = options.limit;
		}



		, limit: function(limit) {
			if (type.number(limit)) this._query.limit = limit;
			return this;
		}

		, offset: function(offset) {
			if (type.number(offset)) this._query.offset = offset;
			return this;
		}


		, filter: function(options) {
			this._parseFilter(this._query, this.tableName, [options]);
			return this;
		}



		, find: function(callback) {
			this._executeQuery(this._rootQuery, function (err, rows) {
				if (err) callback(err);
				else {
					this._rootQuery.set = this._makeSet(rows, this._orm[this._rootQuery.database][this._rootQuery.from]);

					// add required join statements
					this._manageJoins(this._rootQuery);

					// remove queries which are not selected
					this._removeUnUsedQueries(this._rootQuery);

					// eager loading
					this._loadSubresources(this._rootQuery.set, this._rootQuery, function(err){
						if (err) callback(err);
						else callback(null, this._mapResults(this._rootQuery));
					}.bind(this));
				}
			}.bind(this));
		}



		, _executeQuery: function(query, callback){
			this._orm.getDatabase().getConnection(function(err, connection){
				if (err) callback(err);
				else connection.query(query, callback);
			}.bind(this));
		}



		, _makeSet: function(rows, Model) {
			var records = new Set();

			(rows || []).forEach(function(row){
				Object.defineProperty(row, '_isFromDB', {value:true});
				records.push(new Model(row));
			}.bind(this));

			return records;
		}




		// add joins to parentqueries if theri children are filtered but not selected
		, _manageJoins: function(resource){
			if (!resource.query) resource = {query: resource};

			resource.query.subresources.forEach(function(subResource){
				if (subResource.query.subresources.length) this._manageJoins(subResource);
				else {
					// collect filters from this query, joins from all queries downwards until we meet 
					// a query which is selected, apply collected data to it.
					this._margeInvertedFilters(subResource);
				}
			}.bind(this));
		}


		, _margeInvertedFilters: function(resource, filters, joins){

			log.warn(resource.attributeName, resource.selected, Object.keys(resource.query.filter).length);

			if (resource.selected) {
				// apply joins & filters, abort
				resource.query.join = resource.query.join.concat(joins || []);
				resource.query.filter = merge(resource.query.filte, filters);
			}
			else {
				if (Object.keys(resource.query.filter).length) {
					// filtered, pass my filter to the parents
					if (!filters) filters = resource.query.filter;
					else {
						// merge filter
						merge(filters, resource.query.filter);
					}

					if (!joins) joins = resource.rootJoins;
					else joins = resource.rootJoins.concat(joins);

					log(resource.parent);
				}
				else if (joins && joins.length) {
					joins = resource.rootJoins.concat(joins);
				}

				// go a level up
				if (resource.parent && resource.parent.parent) this._margeInvertedFilters(resource.parent, filters, joins);
			}
		}


		

		, _removeUnUsedQueries: function(query, lastSelected) {
			lastSelected = lastSelected || query;

			query.subresources.forEach(function(subQuery){
				if (subQuery.query.subresources.length) this._removeUnUsedQueries(subQuery.query, (subQuery.selected ? subQuery.query : lastSelected));
				else {
					if (!subQuery.selected) {
						lastSelected.subresources = [];
					}
				}
			}.bind(this));
		}



		, _loadSubresources: function(rootRecords, basequery, callback) {
			var queryCollection = [];
			

			if (basequery.subresources.length) {
				basequery.subresources.forEach(function(subquery){
					var   queries 	= this._collectSubQueries(subquery.query)
						, inFilter 	= this._orm.fn.in(rootRecords.getColumnValues(subquery.column));

					queries.push(subquery);

					queries.forEach(function(sQuery){
						if (!sQuery.query.filter[basequery.from]) sQuery.query.filter[basequery.from] = {};
						sQuery.query.filter[basequery.from][subquery.column] = inFilter;
						//sQuery.query.select.push(select);

						queryCollection.push(sQuery);
					}.bind(this));
				}.bind(this));


				// execute all queries
				async.each(queryCollection, function(query, next){
					this._executeQuery(query.query, function(err, records){
						if (err) next(err);
						else {
							query.query.set = this._makeSet(records, query.Model);
							next();
						}
					}.bind(this));
				}.bind(this)

				// map results to models
				, function(err, results){
					if (err) callback(results.filter(function(x){return x instanceof Error;})[0]);
					else callback();
				}.bind(this));
			}
			else callback();
		}


		, _collectSubQueries: function(query) {
			var queries = [].concat(query.subresources);

			query.subresources.forEach(function(subquery){
				if (subquery.query.subresources.length) {
					queries = queries.concat(this._collectSubQueries(subquery.query));
				}
			}.bind(this));

			return queries;
		}


		

		, _mapResults: function(query){
			var   realQuery = query.set ? query : query.query
				, set = realQuery.set;

			 //log.error('entering mapper', realQuery.from);

			realQuery.subresources.forEach(function(subquery){
				set.createMap(subquery.column);

				//log.warn('handling', subquery.query.from);

				subquery.query.set.forEach(function(record){
					var parentRecord = set.getByColumnValue(subquery.column, record.mappingId);

					//log('Adding to parent Record into «'+subquery.attributeName+'» by «'+subquery.table+':'+subquery.column+'('+record.mappingId+')», for the entity «'+subquery.attributeName+'»', '-------------');

					if (!parentRecord) throw new Error('Failed to get parent record «'+subquery.table+':'+subquery.column+'('+record.mappingId+')», for the entity «'+subquery.attributeName+'»');
					else {
						if (subquery.isMapping) parentRecord[subquery.attributeName].addExisiting(record);
						else parentRecord[subquery.attributeName] = record;
					}
				}.bind(this));

				//log.warn(subquery.query.subresources.length);
				//log(subquery.query.subresources);
				if (subquery.query.subresources.length) this._mapResults(subquery);
			}.bind(this));

			return set;
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
								return this._handleMapping(columnName, target, Array.prototype.slice.call(arguments), true);
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
								return this._handleMapping(columnName, target, Array.prototype.slice.call(arguments));
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
							return this._handleBelongsTo(columnName, target, Array.prototype.slice.call(arguments), true);
						};

						QB[this.mapperGetterName(target.model.name, true)] = function() {
							return this._handleBelongsTo(columnName, target, Array.prototype.slice.call(arguments));
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
