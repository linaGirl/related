!function(){

	var   Class 		= require('ee-class')
		, EventEmitter 	= require('ee-event-emitter')
		, log 			= require('ee-log')
		, async 		= require('ee-async')
		, Set 			= require('./Set');




	module.exports = new Class({
		init: function(options) {
			this._resource 	= options.resource;
			this._orm 		= options.orm;
		}



		, find: function(callback){
			var resource = this._resource;

			// prepare filters
			this._prepareFilteredChildResources(resource);

			// check with queries to execute
			this._prepareSelectedChildResources(resource);

			// execut ebase query
			this._executeQuery(resource.query, function(err, rows){
				if (err) callback(err);
				else {
					var queries;

					// create set
					resource.set = this._makeSet(rows, resource.Model)
			

					// collect queries
					queries = this._collectQueries(resource, []);

					// execute queries
					this._executeSubqueries(resource, queries, callback);
				}
			}.bind(this));
		}



		, _executeSubqueries: function(rootResource, queries, callback) {

			async.each(queries, 

			function(resource, next){

				// filter the resource by the ids of the root resource
				rootResource.applyFilter(resource);

				this._executeQuery(resource.query, function(err, rows){
					if (err) next(err);
					else {
						resource.set = this._makeSet(rows, resource.Model);
						next();
					}
				}.bind(this));
			}.bind(this), 

			function(err, results){
				if (err) callback(results.filter(function(x){return x instanceof Error;})[0]);
				else {
					this._buildRelations(this._resource);
					callback(null, this._resource.set);
				}
			}.bind(this));
		}



		, _buildRelations: function(resource) {
			if (resource.hasChildren()) {
				resource.children.forEach(function(childResource){
					var columnName = resource.primaryKeys[0];
					resource.set.createMap(columnName);

					childResource.set.forEach(function(record){
						var parentRecord = resource.set.getByColumnValue(columnName, record.mappingId);
						parentRecord[childResource.name] = record;
					}.bind(this));
					
				}.bind(this));
			}
		}



		// get all selected queries, add the correct filter to them
		, _collectQueries: function(resource, queries) {
			if (resource.hasChildren()) {
				resource.children.forEach(function(childResource){
					if (childResource.selected) queries.push(childResource);
					this._collectQueries(childResource, queries);
				}.bind(this));
			}

			return queries;
		}



		// parse the the resource tree, check which queriies to execute
		// traverse the tree, check if the children are selected, if yes:
		// select all parents
		, _prepareSelectedChildResources: function(resource) {
			if (resource.hasChildren()) {
				resource.children.forEach(function(childResource){
					if (childResource.selected) this._selectParents(childResource);
					this._prepareSelectedChildResources(childResource);
				}.bind(this));
			}
		}


		// recursive select
		, _selectParents: function(resource){
			resource.select();
			if (resource.parentResource) this._selectParents(resource.parentResource);
		}



		, _prepareFilteredChildResources: function(resource) {
			if (resource.hasChildren()) {
				resource.children.forEach(function(childResource){
					if (childResource.hasRootFilter) this._filterParents(childResource);
					this._prepareFilteredChildResources(childResource);
				}.bind(this));
			}
		}


		, _filterParents: function(resource){
			resource.filter();
			if (resource.parentResource) this._filterParents(resource.parentResource);
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

	});
}();
