!function(){

    var   Class         = require('ee-class')
        , log           = require('ee-log')
        , async         = require('ee-async')
        , debug         = require('ee-argv').has('dev-orm')
        , Set           = require('./Set');




    module.exports = new Class({

        init: function(options) {
            this._resource      = options.resource;
            this._orm           = options.orm;
            this.getDatabase    = options.getDatabase;
        }



        , findOne: function(callback) {
            this._resource.query.limit = 1;

            this.find(function(err, results) {
                if (err) callback(err);
                else if (results && results.length) callback(null, results.first());
                else callback();
            }.bind(this));
        }
        


        , find: function(callback) {
            var resource = this._resource;

            // prepare child queries
            this._prepareChildResources(resource);

            // ordering
            this._preparechildResourceForOrdering(resource);

            if (debug) {
                //log.highlight('Compiled queries, the resulting resource: ');
                //log(resource);
            }

            // execut ebase query
            this._executeQuery('query', resource.query, function(err, rows){
                if (err) callback(err);
                else {
                    var queries;

                    // create set
                    resource.set = this._makeSet(rows, resource);

                    if (resource.set.length) {                  

                        // collect queries
                        queries = this._collectQueries(resource, []);

                        if (queries && queries.length) {
                            // execute queries
                            this._executeSubqueries(resource, queries, callback);
                        }
                        else callback(null, resource.set);
                    }
                    else callback(null, resource.set);
                }
            }.bind(this));
        }




        , delete: function(callback) {
            this._executeQuery('delete', this._resource.query, callback);
        }




        , _executeSubqueries: function(rootResource, queries, callback) {

            async.each(queries, 

            function(resource, next){ //log.wtf(resource.name);

                // filter the resource by the ids of the root resource
                rootResource.applyFilter(resource);
                rootResource.applyGroup(resource);
                if (resource.parentResource) resource.parentResource.applyGroup(resource);
                //log(resource);

                this._executeQuery('query', resource.query, function(err, rows){
                    if (err) next(err);
                    else {
                        resource.set = this._makeSet(rows, resource);
                        next();
                    }
                }.bind(this));
            }.bind(this), 

            function(err, results){
                if (err) callback(err);
                else {
                    this._buildRelations(this._resource);
                    callback(null, this._resource.set);
                }
            }.bind(this));
        }



        , _buildRelations: function(resource) {
            if (resource.set && resource.hasChildren()) {
                resource.children.forEach(function(childResource) {
                    if (childResource.set) {

                        if (childResource.set.length) {
                            childResource.set.forEach(function(record) {

                                record._mappingIds.forEach(function(mappingId) {
                                    var parentRecords = resource.set.getByColumnValue(childResource.referencedParentColumn, mappingId);

                                    if (parentRecords && parentRecords.length) {
                                        parentRecords.forEach(function(parentRecord){
                                            //log(childResource.loaderId);
                                            if (childResource.type === 'mapping') {
                                                parentRecord.getMapping(childResource.loaderId).addExisiting(record);
                                                //parentRecord[childResource.name].addExisiting(record);
                                            }
                                            else if (childResource.type === 'belongsTo') {
                                                parentRecord.getBelongsTo(childResource.loaderId).addExisiting(record);
                                                //parentRecord[childResource.name].addExisiting(record);
                                            }
                                            else {
                                                // reference
                                                //parentRecord.setReference(childResource.loaderId, record, true);
                                                parentRecord[childResource.name] = record;
                                            }
                                        }.bind(this));                                        
                                    }   
                                }.bind(this));                                              
                            }.bind(this));
                        }

                        this._buildRelations(childResource);
                    }               
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
        , _prepareChildResources: function(resource) {
            if (resource.hasChildren()) {
                resource.children.forEach(function(childResource){
                    if (debug) log.info('preparing childResource «'+childResource.name.yellow+'», selected: '+((!!childResource.selected)+'').yellow+', hasRootFilter: '+((!!childResource.hasRootFilter)+'').yellow+', filtered: '+((!!childResource.filtered)+'').yellow+'');
                    if (childResource.selected)         this._selectParents(childResource);
                    if (childResource.hasRootFilter)    this._filterParents(childResource);
                    if (childResource.filtered)         this._filterByChildren(childResource, [], childResource.query.filter, childResource.query.from);

                    this._prepareChildResources(childResource);
                }.bind(this));
            }
        }



        , _preparechildResourceForOrdering: function(resource) {
            if (resource.hasChildren()) {
                resource.children.forEach(function(childResource){
                    if (debug) log.info('preparing childResource for ordering «'+childResource.name.yellow+'», selected: '+((!!childResource.selected)+'').yellow+', hasRootFilter: '+((!!childResource.hasRootFilter)+'').yellow+', filtered: '+((!!childResource.filtered)+'').yellow+'');
                    if (childResource.isRootOrdered) childResource.rootOrder();

                    this._preparechildResourceForOrdering(childResource);
                }.bind(this));
            }
        }



        , _filterByChildren: function(resource, joins, filter, resourceName) {
            if (!resource.selected) {
                if (!resource.childrenFiltered) {
                    joins = joins.concat(resource.joins.map(function(joinStatement){
                        return joinStatement.reverseFormat();
                    }));

                    resource.childrenFiltered = true;
                }

                if (resource.parentResource) this._filterByChildren(resource.parentResource, joins, filter, resourceName);
            }
            else if(resource.query.filter !== filter) {
                // apply filter & joins
                resource.query.filter[resourceName] = filter;
                resource.query.join = resource.query.join.concat(joins);
            }
        }


        // recursive select
        , _selectParents: function(resource) {
            resource.select();
            if (resource.parentResource) {
                resource.parentResource.loadRelatingSet(resource.name);
                this._selectParents(resource.parentResource);
            }
        }





        , _filterParents: function(resource, originalResource) {
            if (resource.parentResource) this._filterParents(resource.parentResource);
            resource.filter();
        }



        , _executeQuery: function(mode, query, callback){
            this.getDatabase().executeQuery(mode, query, callback);
        }



        , _makeSet: function(rows, resource) {
            var records = new Set({
                  primaryKeys:  resource.primaryKeys
                , name:         resource.name
            });

            (rows || []).forEach(function(row) {
                Object.defineProperty(row, '_isFromDB', {value:true});
                records.push(new resource.Model(row, resource.relatingSets));
            }.bind(this));

            return records;
        }

    });
}();
