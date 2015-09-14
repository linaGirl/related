!function(){

    var   Class         = require('ee-class')
        , log           = require('ee-log')
        , async         = require('ee-async')
        , debug         = require('ee-argv').has('dev-orm')
        , debugErrors   = require('ee-argv').has('debug-orm-errors')
        , Set           = require('./Set');




    module.exports = new Class({

        init: function(options) {
            this._resource      = options.resource;
            this._orm           = options.orm;
            this.getDatabase    = options.getDatabase;
            this.transaction    = options.transaction;
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


            // rpepare the resources, apply filters & ordering to the
            // root resource, manage selects
            resource.setSelectMode();
            resource.prepare();
            
            // execute the base query
            this._executeQuery(resource.getQueryMode(), resource.query, resource, function(err, rows) {
                if (err) callback(err);
                else {
                    // create set
                    resource.set = this._makeSet(rows, resource);


                    // collect subqueries, if there is data in the base result set
                    if (resource.set.length) this._executeSubqueries(resource, this._collectQueries(resource, []), callback);
                    else callback(null, resource.set);
                }
            }.bind(this));
        }



        , delete: function(callback) {
            this._resource.setDeleteMode();
            this._resource.prepare(true);

            this._executeQuery(this._resource.getQueryMode(), this._resource.query, this._resource, callback);
        }


        , update: function(callback) {
            this._resource.setUpdateMode();
            this._resource.prepare(true);

            this._executeQuery(this._resource.getQueryMode(), this._resource.query, this._resource, callback);
        }


        , count: function(callback, column) {
            this._resource.setSelectMode();
            this._resource.setCountingFlag();
            this._resource.prepare(true);

            this._resource.prepareCounting(column);


            this._executeQuery(this._resource.getQueryMode(), this._resource.query, this._resource, function(err, result) {
                if (err) callback(err);
                else if (result && result.length) callback(null, parseInt(result[0].rowCount, 10));
            }.bind(this));
        }


        /*
         * prepare the query
         */
        , prepare: function() {
            this._resource.prepare(true);
            return this;
        }


        , _executeSubqueries: function(rootResource, queries, callback) {
            async.each(queries, function(resource, next) { 

                // filter the resource by the ids of the root resource
                rootResource.applyFilter(resource);
                
                //rootResource.applyGroup(resource);
                if (resource.parentResource) resource.parentResource.applyGroup(resource);
                //log(resource);

                this._executeQuery('query', resource.query, resource, function(err, rows){
                    if (err) next(err);
                    else {
                        resource.set = this._makeSet(rows, resource);
                        next();
                    }
                }.bind(this));
            }.bind(this), function(err, results){
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
                                        parentRecords.forEach(function(parentRecord) {
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
                                                parentRecord._references[childResource.aliasName] = record;
                                                //parentRecord[childResource.name] = record;
                                            }
                                        }.bind(this));                                        
                                    }   
                                }.bind(this));                                              
                            }.bind(this));
                        }

                        // tell the set 

                        this._buildRelations(childResource);
                    }               
                }.bind(this));
            }
        }



        // get all selected queries, add the correct filter to them
        , _collectQueries: function(resource, queries) {
            if (resource.hasChildren()) {
                resource.children.forEach(function(childResource){
                    if (childResource.isSelected()) queries.push(childResource);
                    this._collectQueries(childResource, queries);
                }.bind(this));
            }

            return queries;
        }



        , _executeQuery: function(mode, query, resource, callback) {
            (this.transaction || this.getDatabase()).executeQuery({
                  mode      : mode
                , query     : query
                , host      : resource.getRootResoure().host
                , debug     : resource.getRootResoure().isInDebugMode()
                , readOnly  : resource.getRootResoure().isReadOnly()
                , callback  : callback
            });
        }



        , _makeSet: function(rows, resource) {
            var records = new Set({
                  primaryKeys:  resource.primaryKeys
                , name:         resource.name
                , resource:     resource
            });

            
            if (rows && rows.length) {
                rows.forEach(function(row) {
                    Object.defineProperty(row, '_isFromDB', {value:true});
                    Object.defineProperty(row, '_set', {value:records});

                    records.push(new resource.Model(row, resource.relatingSets));
                }.bind(this));
            }
           

            return records;
        }

    });
}();
