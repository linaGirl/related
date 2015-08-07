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


        , entityName: null


        , getentityName: function() {
            return this.tableName;
        }


        , init: function(options) {

            // load circular depency if not alread loaded
            if (!ORM) ORM = require('./ORM');

            Class.define(this, '_getDatabase', Class(options.getDatabase))

            // the mapping that us got here
            Class.define(this, '_mapping', Class(options.mapping));


            // chache for querbuilder instances in case the suer calls a relation twice
            Class.define(this, '_queryBuilderInstances', Class({}));

            // we need to access this properts often
            this.tableName = this._definition.getTableName();
            this.databaseName = this._definition.getDatabaseName();
            this.databaseAliasName = this._definition.getDatabaseAliasName();

            // expoee the entities name
            this.entityName = this.tableName;


            // subjoins used for eager loading
            Class.define(this, '_joins', Class(options.joins || []));



            // set or define the root resource
            if (options.rootResource) Class.define(this, '_rootResource', Class(options.rootResource));
            else {
                Class.define(this, '_rootResource', Class(new this.Resource({
                      Model             : this._orm[this.databaseAliasName][this.tableName]
                    , name              : this.tableName
                    , primaryKeys       : this._definition.primaryKeys
                    , queryBuilder      : this
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


        /*
         * return a new advanced querybuilder instance
         */
        , createQueryBuilder: function() {
            return ORM.createQueryBuilder(this);
        }


        /*
         * register an advanced query builder on this object
         */
        , setQueryBuilder: function(qb) {
            if (!this.getrootResource().advancedQueryQuerybuilders)this.getrootResource().advancedQueryQuerybuilders = [];
            this.getrootResource().advancedQueryQuerybuilders.push(qb);
        }


        /*
         * return a new advanced querybuilder instance
         */
        , qb: function() {
            return this.createQueryBuilder();
        }

        /*
         * return a new advanced querybuilder instance
         */
        , queryBuilder: function() {
            return this.createQueryBuilder();
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


        /*
         * returns the model definition
         */
        , getdefinition: function() {
            return this._definition;
        }


        /*
         * return the root resource
         */
        , getrootResource: function() {
            return this._rootResource;
        }

        /*
         * return the root resource
         */
        , rootResource: function() {
            return this._rootResource;
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
        , _handleReference: function(column, targetModel, queryParameters, returnTarget, isJoinCall, leftJoin) { if (debug) log.info('handleReference, from «'+this.tableName.yellow+'» to «'+targetModel.name.yellow+'» ...');
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
                if (!isJoinCall) {
                    instance.parseSelect(queryParameters);
                    instance.parseFilter(queryParameters);

                    if (Object.keys(this._getFilters(queryParameters)).length) instance._resource.setRootFilter(this._getFilters(queryParameters));
                }
                else {
                    instance.getresource().forceJoin(leftJoin);
                }

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
            resource = new this._queryBuilders[targetModelName].Resource({
                  name                      : targetModelName
                , aliasName                 : relationName
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
            if (!isJoinCall) this._parseSelect(resource.query, targetModelName, select);

            // force join
            if (isJoinCall) resource.forceJoin(leftJoin);

            // store the subquery on the current query
            this._resource.children.push(resource);

            // store resource
            this._queryBuilderInstances[relationName] = this._createQueryBuilder(targetModelName, resource, joins);

            // set the querybuilder so it can be accesed from the resource
            resource.queryBuilder = this._queryBuilderInstances[relationName];


            // we may stay at the same level (e.g. fetchModel vs. getModel)
            return returnTarget ? this._queryBuilderInstances[relationName] : this;
        }



        , _createQueryBuilder: function(targetModelName, resource, joins) {
            return new this._queryBuilders[targetModelName]({
                  resource      : resource
                , rootResource  : this._rootResource
                , joins         : joins.concat(this._joins)
                , getDatabase   : this._getDatabase
            });
        }




        , _handleBelongsTo: function(column, targetModel, queryParameters, returnTarget, isJoinCall, leftJoin) { if (debug) log.info('handleBelongsTo, from «'+this.tableName.yellow+'» to «'+targetModel.name.yellow+'» ...');
            var   select            = this._getSelect(queryParameters)
                , filter            = this._getFilters(queryParameters)
                , targetModelName   = targetModel.model.name
                , relationName      = targetModel.aliasName || targetModel.model.name
                , group             = []
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
                    instance.getresource().forceJoin(leftJoin);
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
            resource = new this._queryBuilders[targetModelName].Resource({
                  name                      : targetModelName
                , aliasName                 : relationName
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
            if (!isJoinCall) this._parseSelect(resource.query, targetModelName, select);

            // force join
            if (isJoinCall) resource.forceJoin(leftJoin);

            // store the subquery on the current query
            this._resource.children.push(resource);


            // store resource
            this._queryBuilderInstances[relationName] = this._createQueryBuilder(targetModelName, resource, joins);

            // set the querybuilder so it can be accesed from the resource
            resource.queryBuilder = this._queryBuilderInstances[relationName];


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
        , _handleMapping: function(column, targetModel, queryParameters, returnTarget, isJoinCall, leftJoin){ if (debug) log.info('handleMapping, from «'+this.tableName.yellow+'» to «'+targetModel.name.yellow+'» ...');
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
                    instance.getresource().forceJoin(leftJoin);
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
            resource = new this._queryBuilders[targetModelName].Resource({
                  name                      : targetModelName
                , aliasName                 : relationName
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
            if (!isJoinCall) this._parseSelect(resource.query, targetModel.model.name, select);

            // force join
            if (isJoinCall) resource.forceJoin(leftJoin);

            // store the subquery on the current query
            this._resource.children.push(resource);


            // store resource
            this._queryBuilderInstances[relationName] = this._createQueryBuilder(targetModelName, resource, joins);

            // set the querybuilder so it can be accesed from the resource
            resource.queryBuilder = this._queryBuilderInstances[relationName];

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
            if (type.object(filter)) {
                Object.keys(filter).forEach(function(property){
                    var queryColum, proxyFilter;

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
                    else if (filter[property] && type.function(filter[property].isModel)) {
                        // we got an entity, filter by its primaries0
                        proxyFilter = {};

                        filter[property].getDefinition().primaryKeys.forEach(function(columnName) {
                            proxyFilter[columnName] = filter[property][columnName];
                        });

                        this.get(property, proxyFilter);
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
                else if (item.isRelatedSelector && item.isRelatedSelector()) {
                    item.prepare(this);
                    query.select.push(item);
                }
                else query.select.push(item);
            }.bind(this));
        }


        /*
         * reselect on this entity
         */
        , select: function(selects) {
            this._parseSelect(this._resource.query, this.getentityName(), selects);
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
                  table     : this.tableName
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



        /**
         * enable the bug mode
         *
         * @param <Boolean> optional mode
         */
        , debug: function(status) {
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


        /*
         * execute the query, either using a classic callback or using a promise
         *
         * @param <Function> optional callback
         * @param <Object> optional transaction
         * @param <String> action to execute
         */
        , _execute: function(callback, transaction, action, arg) {
            if (typeof callback !== 'function') {
                // callback is transaction
                if (callback) transaction = callback;

                // return promise
                return new Promise(function(resolve, reject) {
                    new QueryCompiler({
                          orm               : this._orm
                        , getDatabase       : this._getDatabase
                        , resource          : this._rootResource
                        , transaction       : transaction
                    })[action](function(err, data) {
                        if (err) reject(err);
                        else resolve(data);
                    }.bind(this), arg);
                }.bind(this));

            }
            else {
                 new QueryCompiler({
                      orm               : this._orm
                    , getDatabase       : this._getDatabase
                    , resource          : this._rootResource
                    , transaction       : transaction
                })[action](callback, arg);
            }
        }


        /*
         * execute a select query. All parameters can be passed in any
         * order. the returned data may be inconsistent (fetched in n
         * calls using the same filter but a different offset) when
         * working with the setSize parameter
         *
         * when a setSize is passed to this function a callback is not
         * optional, not even when using promises. the callback gets
         * called until there is no more data or tha action was aborted
         *
         * @returns             this or a promise
         *
         * @param <Number>      optional, set size to return. the
         *                      callback will be called until all
         *                      records were returned
         * @param <Function>    optional, callback that will be called
         *                      with the results
         * @param <Object>      optional, a transaction object on which
         *                      the query must be executed.
         */
        , find: function() {
            var   i = 0
                , l = arguments.length
                , query = this.getrootResource().getQuery()
                , offset, callback, transaction, setSize;

            for (; i < l; i++) {
                switch(typeof arguments[i]) {
                    case 'function':
                        callback = arguments[i];
                        break;

                    case 'number':
                        setSize = arguments[i];
                        break;

                    case 'object':
                        transaction = arguments[i];
                        break;
                }
            }

            // maybe we need to fetch the data in n sets
            if (setSize) {
                if (!callback) return Promise.reject(new Errro('The «find» method was called with the setSize parameter but without a callback. Please call this method with a callback which will be called for each set!'));

                // get the start offset
                offset = query.getOffset();

                // set limit
                query.setLimit(setSize);


                // always return a promise, when in callback mode
                // this will be ignored by the user and he has to observe
                // by himself when he got the last set which is if the
                // last parameter is delivered.
                return new Promise(function(resolve, reject) {
                    var   abort
                        , next;

                    abort = function() {
                        reject(new Error('qb.find: action aborted by the user!'));
                    };

                    next = function(err) {
                        if (err && err instanceof Error) reject(err);
                        else {
                            // set new offset
                            query.setOffset(offset);

                            // increase offset
                            offset += setSize;

                            // get data
                            this._execute(function(err, data) {
                                if (err) {
                                    callback(err);
                                    reject(err);
                                }
                                else {
                                    // check if we're finished
                                    if (data.length < setSize) {
                                        callback(null, data, function(){}, function(){}, true);
                                        resolve();
                                    }

                                    // let the user get more records
                                    else callback(null, data, next, abort, false);
                                }
                            }, transaction, 'find');
                        }
                    }.bind(this);

                    // first round
                    next();
                }.bind(this));
            }
            else return this._execute(callback, transaction, 'find');
        }


        /*
         * find one record. pass arguments in any order.
         *
         * @param <Object> optional, transaction
         * @param <Function> optional, callback
         *
         */
        , findOne: function() {
            var   i = 0
                , l = arguments.length
                , callback, transaction;

            for (; i < l; i++) {
                switch(typeof arguments[i]) {
                    case 'function':
                        callback = arguments[i];
                        break;

                    case 'object':
                        transaction = arguments[i];
                        break;
                }
            }

            return this._execute(callback, transaction, 'findOne');
        }


        /*
         * count records. pass arguments in any order.
         *
         * @param <Object> optional, transaction
         * @param <Function> optional, callback
         * @param <String> optional, column to count on
         *
         */
        , count: function() {
            var   i = 0
                , l = arguments.length
                , callback, transaction, column;

            for (; i < l; i++) {
                switch(typeof arguments[i]) {
                    case 'function':
                        callback = arguments[i];
                        break;

                    case 'object':
                        transaction = arguments[i];
                        break;

                    case 'string':
                        column = arguments[i];
                        break;
                }
            }


            return this._execute(callback, transaction, 'count', column);
        }



        /*
         * bulk delete. pass arguments in any order.
         *
         * @param <Object> optional, transaction
         * @param <Function> optional, callback
         *
         */
        , delete: function() {
            var   i = 0
                , l = arguments.length
                , callback, transaction;

            for (; i < l; i++) {
                switch(typeof arguments[i]) {
                    case 'function':
                        callback = arguments[i];
                        break;

                    case 'object':
                        transaction = arguments[i];
                        break;
                }
            }

            return this._execute(callback, transaction, 'delete');
        }



        /*
         * bulk update. pass arguments in any order.
         *
         * @param <Object> optional, transaction
         * @param <Function> optional, callback
         * @param <Object> values to set on the records to update
         *
         */
        , update: function() {
            var   i = 0
                , l = arguments.length
                , callback, transaction, values;

            for (; i < l; i++) {
                switch(typeof arguments[i]) {
                    case 'function':
                        callback = arguments[i];
                        break;

                    case 'object':
                        if (arguments[i] !== null && typeof arguments[i].isTransaction === 'function' && arguments[i].isTransaction()) transaction = arguments[i];
                        else values = arguments[i];
                        break;
                }
            }

            // check the types of the values
            Object.keys(values).forEach(function(columnName) {
                if (values[columnName] && this._definition.columns[columnName].jsTypeMapping === 'date' && !type.date(values[columnName])) values[columnName] = new Date(values[columnName]);
            }.bind(this));

            this._rootResource.query.values = values;

            return this._execute(callback, transaction, 'update');
        }
    });
}();
