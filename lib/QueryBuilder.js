!function(){

    var   Class         = require('ee-class')
        , EventEmitter  = require('ee-event-emitter')
        , log           = require('ee-log')
        , Arguments     = require('ee-arguments')
        , type          = require('ee-types')
        , debug         = require('ee-argv').has('dev-orm')
        , Set           = require('./Set')
        , Query         = require('./Query')
        , Resource      = require('./Resource')
        , JoinStatement = require('./JoinStatement')
        , QueryCompiler = require('./QueryCompiler')
        , ORM;




    module.exports = new Class({

          isQuery: function(){return true;}


        , getEntityName: function() {
            return this.tableName;
        }


        , init: function(options) {

            // load circular depency if not alread loaded
            if (!ORM) ORM = require('./ORM');


            // the mapping that us got here
            Class.define(this, '_mapping', Class(options.mapping));


            // chache for querbuilder instances in case the suer calls a relation twice
            Class.define(this, '_queryBuilderInstances', Class({}));

            // we need to access this properts often
            this.tableName = this._definition.getTableName();
            this.databaseName = this._definition.getDatabaseName();


            // subjoins used for eager loading
            Class.define(this, '_joins', Class(options.joins || []));


            // set or define the root resource
            if (options.rootResource) Class.define(this, '_rootResource', Class(options.rootResource));
            else {
                Class.define(this, '_rootResource', Class(new Resource({
                      Model             : this._orm[this.databaseName][this.tableName]
                    , name              : this.tableName
                    , primaryKeys       : this._definition.primaryKeys
                    , query             : new Query({
                          from:     this.tableName
                        , database: this.databaseName
                    })
                })));

                this._addPrimarySelect();
            }


            // the query we're currently working on
            Class.define(this, '_resource', Class(options.resource || this._rootResource));


            // parse passed parameters (happens only on the root of the query)
            if (options.parameters) {
                this.parseFilter(options.parameters);
                this.parseSelect(options.parameters);
            }
        }




        , parseFilter: function(parameters) {
             this._parseFilter(this._resource.query, this.tableName, this._getFilters(parameters));
        }


        , parseSelect: function(parameters) {
            this._parseSelect(this._resource.query, this.tableName, this._getSelect(parameters));
        }



        // dont filter ou soft deleted records
        , ignoreSoftDelete: function() {
            this._rootResource.ignoreSoftDelete();
            return this;
        }




        /**
         * the _handleReference method is called when the user selects 
         * a referenced subresource on the querybuilder
         * 
         * column           <Object>    definition of the column of this  
         *                              table which refrences the other table
         * targetModel      <Object>    definition of the targeted model of 
         *                              the reference
         * queryParameters  <Array>     parameters passed like the filter & 
         *                              selcet statements
         * returnTarget     <Boolean>   optional, if we're returning the reference
         *                              for this model or the reference of the
         *                              targeted model
         */
        , _handleReference: function(column, targetModel, queryParameters, returnTarget) { if (debug) log.info('handleReference, from «'+this.tableName.yellow+'» to «'+targetModel.name.yellow+'» ...');
            var   select            = this._getSelect(queryParameters)
                , filter            = this._getFilters(queryParameters)
                , targetModelName   = targetModel.name
                , relationName      = column.aliasName || targetModel.name
                , group             = []
                , queryBuilder 
                , instance
                , resource
                , joins;


            if (this._queryBuilderInstances[relationName]) {
                // return cached qb instance
                instance = this._queryBuilderInstances[relationName];
                // apply filters, selects
                instance.parseSelect(queryParameters);
                instance.parseFilter(queryParameters);

                return returnTarget ? instance : this;
            }


            // create basic join definition, it will be converted to more specific join
            // statetments later on
            joins = [new JoinStatement({
                source : {
                      table     : column.referencedTable
                    , column    : column.referencedColumn
                } 
                , target: {
                      table     : this.tableName
                    , column    : column.name
                }
            })];


            targetModel.primaryKeys.forEach(function(key){
                group.push({
                      table     : targetModelName
                    , column    : key
                });
            });


            // create a child tree node for the querybuilder
            resource = new Resource({
                  name                      : targetModelName
                , parentResource            : this._resource
                , Model                     : this._orm[this.databaseName][targetModelName]
                , referencedParentColumn    : column.name
                , referencedParentTable     : this.tableName
                , joins                     : joins
                , filters                   : filter
                , rootResource              : this._rootResource
                , primaryKeys               : targetModel.primaryKeys
                , type                      : 'reference'
                , loaderId                  : column.name
                , query                     : new Query({
                      join                  : joins.concat(this._joins)
                    , database              : this.databaseName
                    , from                  : targetModelName
                    , filter                : {}
                    , group                 : group 
                })
            });


            // process options / select on subquery
            this._parseSelect(resource.query, targetModelName, select);

            // store the subquery on the current query
            this._resource.children.push(resource);

            // store resource
            this._queryBuilderInstances[relationName] = this._createQueryBuilder(targetModelName, resource, joins);


            // we may stay at the same level (e.g. fetchModel vs. getModel)
            return returnTarget ? this._queryBuilderInstances[relationName] : this;
        }



        , _createQueryBuilder: function(targetModelName, resource, joins) {
            return new this._queryBuilders[targetModelName]({
                  resource      : resource
                , rootResource  : this._rootResource
                , joins         : joins.concat(this._joins)
            });
        }




        , _handleBelongsTo: function(column, targetModel, queryParameters, returnTarget) { if (debug) log.info('handleBelongsTo, from «'+this.tableName.yellow+'» to «'+targetModel.name.yellow+'» ...');
            var   select            = this._getSelect(queryParameters)
                , filter            = this._getFilters(queryParameters)
                , targetModelName   = targetModel.model.name
                , relationName      = targetModel.aliasName || targetModel.model.name
                , relationName      = 8
                , group             = []
                , resource
                , joins;


            if (this._queryBuilderInstances[relationName]) {
                // return cached qb instance
                instance = this._queryBuilderInstances[relationName];
                // apply filters, selects
                instance.parseSelect(queryParameters);
                instance.parseFilter(queryParameters);

                return returnTarget ? instance : this;
            }

            // create basic join definition, it will be converted to more specific join
            // statetments later on
            joins = [new JoinStatement({
                source : {
                      table     : targetModel.model.name
                    , column    : targetModel.targetColumn
                } 
                , target: {
                      table     : this.tableName
                    , column    : column.name
                }
            })];


            targetModel.model.primaryKeys.forEach(function(key){
                group.push({
                      table     : targetModelName
                    , column    : key
                });
            });
            

            // create a child tree node for the querybuilder
            resource = new Resource({
                  name                      : targetModelName
                , parentResource            : this._resource
                , Model                     : this._orm[this.databaseName][targetModelName]
                , referencedParentColumn    : column.name
                , referencedParentTable     : this.tableName
                , joins                     : joins
                , filters                   : filter
                , rootResource              : this._rootResource
                , primaryKeys               : targetModel.model.primaryKeys
                , type                      : 'belongsTo'
                , loaderId                  : targetModel.model.name
                , query                     : new Query({
                      join                  : joins.concat(this._joins)
                    , database              : this.databaseName
                    , from                  : targetModelName
                    , filter                : {}
                    , group                 : group
                })
            });
            

            // process options / select on subquery
            this._parseSelect(resource.query, targetModelName, select);

            // store the subquery on the current query
            this._resource.children.push(resource);


            // store resource
            this._queryBuilderInstances[relationName] = this._createQueryBuilder(targetModelName, resource, joins);


            // we may stay at the same level (e.g. fetchModel vs. getModel)
            return returnTarget ? this._queryBuilderInstances[relationName] : this;
        }



        /*
         * the _handleMapping method builds the queries for a mapping
         *
         * @param <String> the name of the column on our side of the mapping
         * @param <Object> the definition of the targeted table of the mapping
         * @param <Array> the parameters passed as filter / select / options for the mapping
         * @param <Boolean> wheter to return a querybuilder instance on the targeted table
         *                  of the paping or to stay on the same querybuilder
         */
        , _handleMapping: function(column, targetModel, queryParameters, returnTarget){ if (debug) log.info('handleMapping, from «'+this.tableName.yellow+'» to «'+targetModel.name.yellow+'» ...');
            var   select            = this._getSelect(queryParameters)
                , filter            = this._getFilters(queryParameters)
                , targetModelName   = targetModel.name
                , relationName      = targetModel.aliasName || targetModel.name
                , group             = []
                , resource
                , joins;


            if (this._queryBuilderInstances[relationName]) {
                // return cached qb instance
                instance = this._queryBuilderInstances[relationName];
                // apply filters, selects
                instance.parseSelect(queryParameters);
                instance.parseFilter(queryParameters);

                return returnTarget ? instance : this;
            }


            // create basic join definition, it will be converted to more specific join
            // statetments later on
            joins = [new JoinStatement({
                source : {
                      table     : targetModel.model.name
                    , column    : targetModel.column.name
                } 
                , target: {
                      table     : targetModel.via.model.name
                    , column    : targetModel.via.otherFk
                }
            }), new JoinStatement({
                source : {
                      table     : targetModel.via.model.name
                    , column    : targetModel.via.fk                    
                } 
                , target: {  
                      table     : this.tableName
                    , column    : column.name
                }
            })];


            // group by pk of taarget and by pk of the parent model (this model)
            targetModel.model.primaryKeys.forEach(function(key){
                group.push({
                      table     : targetModel.model.name
                    , column    : key
                });
            }.bind(this));

            //log(this._definition);
            this._definition.primaryKeys.forEach(function(key){
                group.push({
                      table     : this.tableName
                    , column    : key
                });
            }.bind(this));



            // create a child tree node for the querybuilder
            resource = new Resource({
                  name                      : targetModelName
                , parentResource            : this._resource
                , Model                     : this._orm[this.databaseName][targetModel.model.name]
                , referencedParentColumn    : column.name
                , referencedParentTable     : this.tableName
                , joins                     : joins
                , filters                   : filter
                , rootResource              : this._rootResource
                , primaryKeys               : targetModel.model.primaryKeys
                , type                      : 'mapping'
                , loaderId                  : targetModel.via.model.name
                , query                     : new Query({
                      join                  : joins.concat(this._joins)
                    , database              : this.databaseName
                    , from                  : targetModel.model.name
                    , filter                : {}
                    , group                 : group
                })
            });



            // process options / select on subquery
            this._parseSelect(resource.query, targetModel.model.name, select);

            // store the subquery on the current query
            this._resource.children.push(resource);


            // store resource
            this._queryBuilderInstances[relationName] = this._createQueryBuilder(targetModelName, resource, joins);


            // we may stay at the same level (e.g. fetchModel vs. getModel)
            return returnTarget ? this._queryBuilderInstances[relationName] : this;
        }



        , _getFilters: function(parameters) {
            return new Arguments(parameters).getObject({});
        }

        , _getSelect: function(parameters) {
            var   args          = new Arguments(parameters)
                , stringSelect  = args.getString();

            return args.getArray((stringSelect? [stringSelect] : []));
        }

        , _getOptions: function(parameters) {
            return new Arguments(parameters).getObjectByIndex(1, {});
        }


        , _parseFilter: function(query, tablename, filter) {
            Object.keys(filter).forEach(function(property){
                var queryColum;

                if (!query.filter[tablename]) query.filter[tablename] = {};
                if (filter[property] && type.function(filter[property].isQuery)) {
                    // get the corret identifier for the subquery
                    queryColum = this._findColumnForIdentifier(property);
                    query.filter[tablename][queryColum.name] = filter[property];

                    // select the first primary if nothing was selected by the user
                    if (!filter[property]._resource.query.select.length) {
                        filter[property]._resource.query.select.push(filter[property]._definition.primaryKeys[0]);
                    }
                }
                else query.filter[tablename][property] = filter[property];
            }.bind(this));
        }


        , _findColumnForIdentifier: function(propertyName) {
            var resultingColumn;

            Object.keys(this._definition.columns).some(function(colName) {
                column = this._definition.columns[colName];

                if (column.name === propertyName) return resultingColumn = column, true;

                if (column.referencedTable === propertyName) return resultingColumn = column, true; 
               
                if (column.mapsTo && column.mapsTo.length) {
                    column.mapsTo.some(function(mapping){
                        var id = mapping.aliasName || mapping.name;
                        if(id === propertyName) return resultingColumn = column, true;
                    }.bind(this));

                    if (resultingColumn) return true;
                }

                if (column.belongsTo && column.belongsTo.length) {
                    column.belongsTo.some(function(belongsTo){
                        var id = belongsTo.aliasName || belongsTo.name;
                        if(id === propertyName) return resultingColumn = column, true;
                    }.bind(this));

                    if (resultingColumn) return true;
                }
            }.bind(this));

            return resultingColumn;
        }

        , _parseSelect: function(query, tablename, select) {
            select.forEach(function(item){
                query.select.push(item);
            }.bind(this));
        }



        , limit: function(limit) {
            this._resource.query.limit(limit);
            return this;
        }

        , offset: function(offset) {
            this._resource.query.offset(offset);
            return this;
        }


        , group: function(column) {
            this._resource.query.group.push({
                  table     : this.tableName
                , column    : column
            });

            return this;
        }


        , orderRoot: function(item, desc) {
            this._resource.order.push({
                  property  : item
                , desc      : !!desc
                , priority  : this._rootResource.orderId
            });
            return this;
        } 

        , orderRootAsc: function(item) {
            this.orderRoot(item, false);
            return this;
        }

        , orderRootDesc: function(item) {
            this.orderRoot(item, true);
            return this;
        }



        , order: function(item, desc) {
            if (!this._resource.query.order) this._resource.query.order = []; 
            this._resource.query.order.push({
                  entity    : this.tableName+this._resource.id
                , property  : item
                , desc      : !!desc
                , priority  : this._rootResource.orderId
            });
            return this;
        }

        , orderAsc: function(item) {
            this.order(item, false);
            return this;
        }

        , orderDesc: function(item) {
            this.order(item, true);
            return this;
        }




        , filter: function(filter) {
            //this._resource.query.filter = filter;
            this._parseFilter(this._resource.query, this.tableName, filter);
            return this;
        }


        , _addPrimarySelect: function() {
            if (this._rootResource.query.select.length) {
                this._definition.primaryKeys.forEach(function(key){
                    this._rootResource.query.select.push(key);
                }.bind(this));
            }
        }


        , getResource: function() {
            return this._rootResource;
        }


        , find: function(callback, transaction) {
            new QueryCompiler({
                  orm               : this._orm
                , getDatabase       : this._getDatabase
                , resource          : this._rootResource
                , transaction       : transaction
            }).find(callback);
        }


        , findOne: function(callback, transaction) {
            new QueryCompiler({
                  orm               : this._orm
                , getDatabase       : this._getDatabase
                , resource          : this._rootResource
                , transaction       : transaction
            }).findOne(callback);
        }


        /* 
         * prepare the queries
         */
        , prepare: function() {
            new QueryCompiler({
                  orm               : this._orm
                , getDatabase       : this._getDatabase
                , resource          : this._rootResource
            }).prepare();
            return this;
        }


        , delete: function(callback, transaction) {
            new QueryCompiler({
                  orm               : this._orm
                , getDatabase       : this._getDatabase
                , resource          : this._rootResource
                , transaction       : transaction
            }).delete(callback);
        }


        , update: function(values, callback, transaction) {
            this._rootResource.query.values = values;
            new QueryCompiler({
                  orm               : this._orm
                , getDatabase       : this._getDatabase
                , resource          : this._rootResource
                , transaction       : transaction
            }).update(callback);
        }
    });
}();
