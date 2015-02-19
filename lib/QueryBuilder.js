!function() {
    'use strict';



    var   Class                 = require('ee-class')
        , log                   = require('ee-log')
        , type                  = require('ee-types')
        , debug                 = require('ee-argv').has('dev-orm')
        , Set                   = require('./Set')
        , Query                 = require('./Query')
        , JoinStatement         = require('./JoinStatement')
        , QueryCompiler         = require('./QueryCompiler')
        , QueryBuilderMethods   = require('./QueryBuilderMethods')
        , Promise               = Promise || require('es6-promise').Promise
        , ORM;





    /**
     * this is the user facing query builder interface 
     * which has automatically generated interfaces
     * for querying the database. Please pay attention
     * that neither variables nor methods start with the
     * words «get», «fetch» or «join»
     */


    module.exports = new Class({
        inherits: QueryBuilderMethods


        // indicate that this is a query, this is 
        // used by the sql query builders
        , isQuery: true



        // returns the entity name
        , entityName: {
            get: function() {
                return this.tableName;
            }
        }



        /**
         * set up this query builder, it stands in direct 
         * correlation to the parent query builder, or nothing
         *
         * @returns <object> query builder class instance
         */
        , init: function(options) {

            // load circular depency if not alread loaded
            if (!ORM) ORM = this._orm.getORM();


            // the setup has basically two modes, the first when the 
            // query builer is called by the user on the root level, the
            // other if its called on top of another querybuilder - 
            // then they have a direct relation between each other
            if (options.parent) {

                // store the ref to the parent
                this.parentQueryBuilder = options.parent;
            }


            // storage for query parameters
            this.queryParameters = [];



            // helps us getting the current transaction or db for 
            // executing queries on it
            Class.define(this, '_getDatabase', Class(options.getDatabase || options.parent._getDatabase))


            // storage for query builders that are created
            // from a rellation on this query builder
            Class.define(this, '_queryBuilderInstances', Class({}));


            // cache a reference to the root query builder
            // we're going to use it regularly
            Class.define(this, 'rootQueryBuilder', Class(this.obtainRootQueryBuilder()));
        }







        //////// GETTERS ////////


        /**
         * returns the root query builder, please
         * use the rootQueryBuilder property whenever
         * possible
         *
         * @returns <object> query builder class instace
         */
        , obtainRootQueryBuilder: function() {
            return this.parentQueryBuilder ? this.parentQueryBuilder.obtainRootQueryBuilder() : this;
        }



        /*
         * returns the model definition
         */
        , obtainDefinition: function() {
            return this._definition;
        }








        //////// SETTERS ////////



        /**
         * stores query parameters
         *
         * @param <object> QueryParameters class instance
         */
        , storeQueryParameters: function(queryParameters) {
            this.queryParameters.push(queryParameters);
        }



        /**
         * this entity needs to be joined using an inner 
         * join, no fields selected, no filters set, just
         * an old plain inner join
         */
        , forceJoin: function() {
            this.forceInnerJoin = true;
        }


        /*
         * return a new advanced querybuilder instance
         *
         * @returns <object> advances query builder class instance
         */
        , createQueryBuilder: function() {
            return ORM.createQueryBuilder(this);
        }




        /* 
         * register an advanced query builder on this object
         */
        , registerQueryBuilder: function(queryBuilder) {
            /*if (!this.getrootResource().advancedQueryQuerybuilders)this.getrootResource().advancedQueryQuerybuilders = [];
            this.getrootResource().advancedQueryQuerybuilders.push(queryBuilder);*/
        }








        //////// CLASS METHODS ////////
        

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
        , _handleReference: function(column, targetModel, queryParameters, returnTarget, isJoinCall) {
            var   targetModelName   = targetModel.name
                , relationName      = column.aliasName || targetModel.name
                , instance;


            if (debug) log.info('handleReference, from «'+this.tableName.yellow+'» to «'+targetModel.name.yellow+'» ...');


            // check for an existing querybuilder instance for this relation
            if (this._queryBuilderInstances[relationName]) {

                // use the cached instance
                instance = this._queryBuilderInstances[relationName];
            }
            else {

                // create a new instance
                instance = new this._queryBuilders[targetModelName]({
                    parent: this
                });

                // cache
                this._queryBuilderInstances[relationName] = instance;
            }


            // let the qb parse the paratmers
            instance.storeQueryParameters(queryParameters);

            // if this is a join call we need to tell this the qb
            if (isJoinCall) instance.forceJoin();

            // return the new scope?
            return returnTarget ? instance : this;
        }





        , _createQueryBuilder: function(targetModelName, resource, joins) {
            return new this._queryBuilders[targetModelName]({
                  resource      : resource
                , rootResource  : this._rootResource
                , joins         : joins.concat(this._joins)
                , getDatabase   : this._getDatabase
            });
        }




        , _handleBelongsTo: function(column, targetModel, queryParameters, returnTarget, isJoinCall) { if (debug) log.info('handleBelongsTo, from «'+this.tableName.yellow+'» to «'+targetModel.name.yellow+'» ...');
            var   select            = this._getSelect(queryParameters)
                , filter            = this._getFilters(queryParameters)
                , targetModelName   = targetModel.model.name
                , relationName      = targetModel.aliasName || targetModel.model.name
                , group             = []
                , nextId            = this._rootResource.getNextId()
                , resource
                , joins;


            if (this._queryBuilderInstances[relationName]) {
                // return cached qb instance
                instance = this._queryBuilderInstances[relationName];
                // apply filters, selects
                if (!isJoinCall) {
                    instance.parseSelect(queryParameters);
                    instance.parseFilter(queryParameters);

                    if (Object.keys(this._getFilters(queryParameters)).length) instance._resource.setRootFilter(this._getFilters(queryParameters));
                }
                else {
                    instance.getresource().forceJoin();
                }

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
                      table     : this._resource.getAliasName()
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
            resource = new this._queryBuilders[targetModelName].Resource({
                  name                      : targetModelName
                , parentResource            : this._resource
                , Model                     : this._orm[this.databaseName][targetModelName]
                , referencedParentColumn    : column.name
                , referencedParentTable     : this._resource.getAliasName()
                , joins                     : joins
                , filters                   : filter
                , rootResource              : this._rootResource
                , primaryKeys               : targetModel.model.primaryKeys
                , type                      : 'belongsTo'
                , loaderId                  : targetModel.model.name
                , query                     : new Query({
                      join                  : joins.concat(this._joins)
                    , database              : this.databaseName
                    , table                 : targetModelName
                    , filter                : {}
                    , group                 : group
                })
            });


            // process options / select on subquery
            if (!isJoinCall) this._parseSelect(resource.query, targetModelName, select);
            
            // force join
            if (isJoinCall) resource.forceJoin();

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
        , _handleMapping: function(column, targetModel, queryParameters, returnTarget, isJoinCall){ if (debug) log.info('handleMapping, from «'+this.tableName.yellow+'» to «'+targetModel.name.yellow+'» ...');
            var   select            = this._getSelect(queryParameters)
                , filter            = this._getFilters(queryParameters)
                , targetModelName   = targetModel.name
                , relationName      = targetModel.aliasName || targetModel.name
                , group             = []
                , resource
                , joins;



            if (this._queryBuilderInstances[relationName]) {
                if (debug) log.warn('returning cached querybuilder for %s ...', targetModelName);

                // return cached qb instance
                instance = this._queryBuilderInstances[relationName];

                // apply filters, selects
                if (!isJoinCall) {
                    instance.parseSelect(queryParameters);
                    instance.parseFilter(queryParameters);

                    if (Object.keys(this._getFilters(queryParameters)).length) instance._resource.setRootFilter(this._getFilters(queryParameters));
                }
                else {
                    instance.getresource().forceJoin();
                }

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
                      table     : this._resource.getAliasName()
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
                      table     : this._resource.getAliasName()
                    , column    : key
                });
            }.bind(this));


            // create a child tree node for the querybuilder
            resource = new this._queryBuilders[targetModelName].Resource({
                  name                      : targetModelName
                , parentResource            : this._resource
                , Model                     : this._orm[this.databaseName][targetModel.model.name]
                , referencedParentColumn    : column.name
                , referencedParentTable     : this._resource.getAliasName()
                , joins                     : joins
                , filters                   : filter
                , rootResource              : this._rootResource
                , primaryKeys               : targetModel.model.primaryKeys
                , type                      : 'mapping'
                , loaderId                  : targetModel.via.model.name
                , query                     : new Query({
                      join                  : joins.concat(this._joins)
                    , database              : this.databaseName
                    , table                  : targetModel.model.name
                    , filter                : {}
                    , group                 : group
                })
            });



            // process options / select on subquery
            if (!isJoinCall) this._parseSelect(resource.query, targetModel.model.name, select);
            
            // force join
            if (isJoinCall) resource.forceJoin();

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
            if (filter && type.object(filter)) {
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


        /**
         * apply a select statement to a query
         */
        , _parseSelect: function(query, tableName, select) {
            select.forEach(function(item) {
                if (item === '*') {
                    Object.keys(this._getDatabase()[tableName].getDefinition().columns).forEach(function(columnName) {
                        if (query.select.indexOf(columnName) === -1) query.select.push(columnName);
                    }.bind(this));

                    // all fields should be selected, extensions needd to know this
                    query.select.selectAll = true;
                }
                else query.select.push(item);
            }.bind(this));
        }


        /*
         * reselect on this entity
         */
        , select: function(selects) {
            this._parseSelect(this._resource.query, null, selects);
            return this;
        }


        , limit: function(limit) {
            this._resource.query.setLimit(limit);
            return this;
        }

        , offset: function(offset) {
            this._resource.query.setOffset(offset);
            return this;
        }


        , group: function(column) {
            this._resource.query.group.push({
                  table     : this._resource.getAliasName()
                , column    : column
            });

            return this;
        }


        , orderRoot: function(column, desc, byArray) {
            this._resource.order.push({
                  property  : column
                , desc      : !!desc
                , byArray   : byArray
                , priority  : this._rootResource.orderId
            });
            return this;
        } 

        , orderRootAsc: function(column, byArray) {
            this.orderRoot(column, false, byArray);
            return this;
        }

        , orderRootDesc: function(column, byArray) {
            this.orderRoot(column, true, byArray);
            return this;
        }


        /**
         * set the order statement
         *
         * @param <string> column
         * @param <boolea> true if desc
         * @param <array> optional array to sort by
         */
        , order: function(column, desc, byArray) {
            if (!this._resource.query.order) this._resource.query.order = [];

            this._resource.query.order.push({
                  entity    : this.tableName+(this.getresource().isRootResource() ? this._resource.id : '')
                , property  : column
                , desc      : !!desc
                , byArray   : byArray
                , priority  : this._rootResource.orderId
            });
            return this;
        }


        /**
         * set ASC the order statement
         *
         * @param <string> column
         * @param <array> optional array to sort by
         */
        , orderAsc: function(column, byArray) {
            this.order(column, false, byArray);
            return this;
        }


        /**
         * set DESC the order statement
         *
         * @param <string> column
         * @param <array> optional array to sort by
         */
        , orderDesc: function(column, byArray) {
            this.order(column, true, byArray);
            return this;
        }




        , filter: function(filter) {
            //this._resource.query.filter = filter;
            this._parseFilter(this._resource.query, this._resource.getAliasName(), filter);
            return this;
        }


        , _addPrimarySelect: function() {
            if (this._rootResource.query.select.length) {
                this._definition.primaryKeys.forEach(function(key){
                    this._rootResource.query.select.push(key);
                }.bind(this));
            }
        }


        , getresource: function() {
            return this._resource;
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


        /*
         * enable query debugger
         */
        , setDebugMode: function(status) {
            if (type.undefined(status) || status) this.getrootResource().debug();
            return this;
        }


        /*
         * enable query debugger
         */
        , debug: function() {
            this.getrootResource().debug();
            return this;
        }
    });
}();
