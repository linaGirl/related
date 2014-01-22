!function(){

	var   Class 		= require('ee-class')
		, EventEmitter 	= require('ee-event-emitter')
		, log 			= require('ee-log')
		, clone 		= require('clone')
		, args 			= require('ee-arguments')
		, type 			= require('ee-types')
		, async 		= require('ee-async')
		, pluralize 	= require('pluralize')
		, Set 			= require('./Set')
		, Query 		= require('./Query');




	var QueryBuilder = {
		  inherits: EventEmitter


		, init: function(options) {
			// remove deprecated parent property
			delete this.parent;


			// this will give us acces to the orm, the querybuilders and the 
			// table definition, this method is set by the exported class below
			this._setProperties();


			// we need to access this properts often
			this._tablename = this._definition.getTableName();
			this._databaseName = this._definition.getDatabaseName();

			// subjoins used for eager loading
			this._subJoins = options.subJoins || [];

			// set or define the root query
			if (options.rootQuery) this._rootQuery = options.rootQuery;
			else {
				this._rootQuery = new Query({
					  from: 	this._tablename
					, database: this._databaseName
				});
			}


			// the current query
			this._query = options.query || this._rootQuery;


			// parse passed paramters
			if (options.parameters) {
				this._parseFilter(this._query, this._tablename, options.parameters);
				this._parseOptions(this._query, this._tablename, options.parameters);
				this._parseSelect(this._query, this._tablename, options.parameters);
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
				, subQuery;


			// the definition of our column
			column = this._definition.columns[columnName];


			// add join statements to the current query
			this._rootQuery.join.push({
				  type: 'inner'
				, source: this._createJoinObject(this._tablename, column.name)
				, target: this._createJoinObject(mappingTargetDefinition.via.model.name, mappingTargetDefinition.via.fk)
			});

			this._rootQuery.join.push({
				  type: 'inner'
				, source: this._createJoinObject(mappingTargetDefinition.via.model.name, mappingTargetDefinition.via.otherFk)
				, target: this._createJoinObject(mappingTargetDefinition.model.name, mappingTargetDefinition.column.name)
			});


			// create joins for the subqueries
			var subJoins = this._subJoins.concat([
				{
					  type:  	'inner'
					, source: 	this._createJoinObject(mappingTargetDefinition.model.name, mappingTargetDefinition.column.name)
					, target: 	this._createJoinObject(mappingTargetDefinition.via.model.name, mappingTargetDefinition.via.otherFk)
				}
				, {
					  type:  	'inner'
					, source:	this._createJoinObject(mappingTargetDefinition.via.model.name, mappingTargetDefinition.via.fk)
					, target: 	this._createJoinObject(this._tablename, column.name)
				}
			]);



			// define subquery
			subQuery = {
				  attributeName 	: mappingTargetDefinition.name
				, selected 			: !!this._getSelect(queryParameters).length
				, column 			: column.name
				, table 			: this._tablename
				, Model 			: this._orm[this._databaseName][mappingTargetDefinition.model.name]
				, query: new Query({
					select: [function(){
					  	return {
						  	  table 	: this._tablename
						  	, column 	: column.name
						  	, alias 	: '____id____'
						  }
					}.bind(this)]
					, join 			: subJoins
					, database 		: this._databaseName
					, from 			: mappingTargetDefinition.model.name
					, subresources 	: []
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
					  query: 		subQuery.query
					, rootQuery: 	this._rootQuery
					, subJoins: 	clone(subJoins)
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
			return args(parameters, 'object', {}, 2);
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

		}



		, find: function(callback) {
			this._executeQuery(this._rootQuery, function (err, rows) {
				if (err) callback(err);
				else {
					this._rootQuery.set = this._makeSet(rows, this._orm[this._rootQuery.database][this._rootQuery.from]);

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
				records.push(new Model(row));
			}.bind(this));

			return records;
		}



		, _removeUnUsedQueries: function(query, lastSelected) {
			lastSelected = lastSelected || query;

			query.subresources.forEach(function(subQuery){
				if (subQuery.query.subresources.length) this._removeUnUsedQueries(subQuery.query, (subQuery.selected ? subQuery.query : lastSelected));
				else {
					if (!subQuery.selected)  lastSelected.subresources = [];
				}
			}.bind(this));
		}



		, _loadSubresources: function(rootRecords, basequery, callback) {

			if (basequery.subresources.length) {

				// execute all queries
				async.each(basequery.subresources, function(query, next){
					query.query.filter = {};
					query.query.filter[query.table] = {};
					query.query.filter[query.table][query.column] = this._orm.fn.in(rootRecords.getColumnValues(query.column));


					this._executeQuery(query.query, function(err, records){
						if (err) next(err);
						else {
							query.set = this._makeSet(records, query.Model);

							// got subresources?
							if (query.query.subresources.length) this._loadSubresources(query.set, query, next);
							else next();
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
		

		, _mapResults: function(query){
			var set = query.set;

			query.subresources.forEach(function(subquery){
				set.createMap(subquery.column);
				set.createSubResourceContainer(subquery.attributeName);

				subquery.set.forEach(function(record){
					var parentRecord = set.getByColumnValue(subquery.column, record.mappingId);

					if (!parentRecord) throw new Error('Failed to get parent record «'+subquery.table+':'+subquery.column+'», value «'+record.mappingId+'»');
					else {
						parentRecord[subquery.attributeName].push(record);
					}
				}.bind(this));

				if (subquery.query.subresources.length) this._mapResults(subquery.query);
			}.bind(this));

			return set;
		}
	};







	// initialize the querybuilder for the specific model
	module.exports = new Class({

		init: function(orm, queryBuilders, definition) {
			var QB = {};

			QB._setProperties = function(){
				this._queryBuilders = queryBuilders
				this._definition = definition;
				this._orm = orm;
			}

			// clone class
			Object.keys(QueryBuilder).forEach(function (key) {
				QB[key] = QueryBuilder[key];
			}.bind(this));


			// create getter mthods
			Object.keys(definition.columns).forEach(function (columnName) {
				var column = definition.columns[columnName];

				// mappin grelations
				if (column.mapsTo.length) {
					column.mapsTo.forEach(function(target){
						QB[this.mapperGetterName(target.model.name)] = function() {
							return this._handleMapping(columnName, target, Array.prototype.slice.call(arguments), true);
						};

						QB[this.mapperGetterName(target.model.name, true)] = function() {
							return this._handleMapping(columnName, target, Array.prototype.slice.call(arguments));
						};
					}.bind(this));
				}

				// reference
				if (column.referencedModel) {
					QB[this.getterName(column.referencedModel.name)] = function() {
						return this._handleReference(columnName, Array.prototype.slice.call(arguments), true);
					};

					QB[this.getterName(column.referencedModel.name, true)] = function() {
						return this._handleReference(columnName, Array.prototype.slice.call(arguments));
					};
				}

				// belongs to
				if (column.belongsTo.length) {
					column.belongsTo.forEach(function(target){
						QB[this.mapperGetterName(target.name)] = function() {
							return this._handleBelongsTo(columnName, Array.prototype.slice.call(arguments), true);
						};

						QB[this.mapperGetterName(target.name, true)] = function() {
							return this._handleBelongsTo(columnName, Array.prototype.slice.call(arguments));
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
			id = pluralize.plural(id);
			return (fetch ? 'fetch' : 'get') + id[0].toUpperCase()+id.slice(1);
		}
	});
}();
