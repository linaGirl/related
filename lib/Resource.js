(function() {
    'use strict';

    var   Class         = require('ee-class')
        , EventEmitter  = require('ee-event-emitter')
        , debug         = require('ee-argv').has('dev-orm')
        , log           = require('ee-log')
        , type          = require('ee-types')
        , Query         = require('./Query')
        , ORM;




    module.exports = new Class({
        inherits: EventEmitter

        // avilable query modes
        , MODE_SELECT: 'select'
        , MODE_UPDATE: 'update'
        , MODE_INSERT: 'insert'
        , MODE_DELETE: 'delete'


        // id counter for the root resource
        , _id: 0

        // is set to true as soon the join statement
        // was applied to the root resource
        , _joinApplied: false

        // is set to true as soon the filter statement
        // was applied to the root resource
        , _filterApplied: false

        // is set to true as soon the order statement
        // was applied to the root resource
        , _orderingApplied: false

        // is set to true as soon the current resource
        // was prepared for selection
        , _selectApplied: false

        // wheter to delete soft deleted records, does only work if the configuration
        // did enable the timestamps option (including the deleted property)
        , _filterDeleted: true

        // if this resource has filters that must be applied to the root resource
        , _hasRootFilters: false

        // indicate if the query was prepared already
        , _isPrepared: false

        // if this resource has ordering that must be applied to the root resource
        // use this.order.length instead
        //, _hasRootOrdering: false


        // should this quer be debugged?
        , _debugMode: false


        // indicates for what type of a query the resource is prepared
        , _queryMode: null

        // if set to true this table and all its parent are joined to the query
        , _forceJoin: false

        // if set to true, the table must be joined using a left join
        , _forceLeftJoin: true

        // select was executeed?
        , selectExecuted: false

        // pool to execute the query on, if null
        // the pool is determined on a query base
        , pool: null


        // indicates if this query has to wait until 
        // all queries ebfore it have been executed
        // on a transaction
        , wait: false


        // if this flag is set the query compiler must
        // return plain json instead of models
        , raw: false



        // returns an id which is used to priorize the order stetements
        , orderId: { get: function() {
            if (!this._orderPrioriztionId) this._orderPrioriztionId = 0;
            return ++this._orderPrioriztionId;
        }}


        , init: function (options) {
            this.query                  = options.query;
            this.filters                = options.filters;
            this.joins                  = options.joins || [];
            this.type                   = options.type;
            this.name                   = options.name;
            this.aliasName              = options.aliasName;
            this.databaseName           = options.query.database;
            this.parentResource         = options.parentResource;
            this.Model                  = options.Model;
            this.referencedParentColumn = options.referencedParentColumn;
            this.referencedParentTable  = options.referencedParentTable;
            this.primaryKeys            = options.primaryKeys;
            this.rootResource           = options.rootResource;
            this.loaderId               = options.loaderId;
            this.queryBuilder           = options.queryBuilder;
            this.targetColumn           = options.targetColumn;
            this.targetModel            = options.targetModel;


            // order statetemnt for the root query
            Class.define(this, 'order', Class([]).Enumerable());

            // we nedd to store childresources
            Class.define(this, 'children', Class([]).Enumerable());

            // indicates which relatingsets must be laoded
            Class.define(this, 'relatingSets', Class({}).Enumerable());

            // appliedjoins, we need to make sure to not apply joins twice
            Class.define(this, '_appliedJoins', Class({}));


            // set indicator for root filters
            this._hasRootFilters = this.filters && Object.keys(this.filters).length;


            // make sure we have access to the orm (circular dependency)
            if (!ORM) ORM = require('./ORM');

            // get an unique id
            if (this.parentResource) this.id = this.getUniqueId();
            else this.id = '';

            if (debug)  log.info('New resource ['+(this.id||this._id)+'] '+this.name.cyan+', has rootFilters: '+ ((!!this._hasRootFilters)+'').yellow+', is selected: '+ ((!!this.selected)+'').yellow+'');
        }


        /*
         * set mode to has root filters (so this wil lbe joined to the root query)
         */
        , setRootFilter: function(filter) {
            this._hasRootFilters = true;

            if (!this.filters) this.filters = filter;
            else this._mergeFilters(this.filters, filter);
        }



        /*
         * returns the debugmode of this query
         */
        , isInDebugMode: function() {
            return this._debugMode;
        }


        /*
         * eable debugmode
         */
        , debug: function() {
            this._debugMode = true;
        }



        /**
         * is this a readonly query?
         */
        , isReadOnly: function() {
            return this._queryMode === this.MODE_SELECT;
        }
        

        /*
         * has a filter?
         */
        , hasFilters: function() {
            if (this._hasFilter) return true;
            else {
                if (this.filters && Object.keys(this.filters).length) {
                    this._hasFilter = true;
                    return true;
                }
                else return false;
            }
        }


        /*
         * return the filter object
         */
        , getFilter: function() {
            return this.filters;
        }



        /*
         * merge filter object
         */
        , _mergeFilters: function(existing, newFilter) {

            Object.keys(newFilter).forEach(function(key) {
                if (existing[key]) {
                    if (type.object(existing[key]) && type.object(newFilter[key])) this._mergeFilters(existing[key], newFilter[key]);
                    else existing[key] = ORM.and([existing[key], newFilter[key]]);
                }
                else existing[key] = newFilter[key];
            }.bind(this));
        }


        /*
         * force this table to be joined
         */
        , forceJoin: function(leftJoin) {

            this._forceJoin = true;

            // the user may force a left join
            if (!leftJoin && this._forceLeftJoin) this._forceLeftJoin = false;
            else this._forceLeftJoin = true;


            // this triggers that all parents are joined via inner join and not
            // the default left join
            if (this.hasParent() && !this.getParent().isRootResource()) this.getParent().forceJoin(leftJoin);
        }


        /*
         * sets the resource into query mode
         */
        , setSelectMode: function() {
            this._queryMode = this.MODE_SELECT;
        }


        /*
         * tell the resource that we're in counting mode
         */
        , setCountingFlag: function() {
            this._countingQuery = true;
        }


        /*
         * sets the resource into query mode
         */
        , setDeleteMode: function() {
            this._queryMode = this.MODE_DELETE;
        }


        /*
         * sets the resource into query mode
         */
        , setUpdateMode: function() {
            this._queryMode = this.MODE_UPDATE;
        }


        /*
         * sets the resource into query mode
         */
        , setInsertMode: function() {
            this._queryMode = this.MODE_INSERT;
        }


        /*
         * return the query mode
         */
        , getQueryMode: function() {
            return this._queryMode;
        }



        /**
         * returns th orm object
         */
        , getORM: function() {
            return ORM;
        }



        /**
         * set the pool to execute this query on
         *
         */
        , setPool: function(identifier) {
            this.pool = identifier;
        }





        // don't filter ou t soft dleted records
        , ignoreSoftDelete: function() {
            this._filterDeleted = false;
        }


        // get an unique id for this query ( get it fromt the root resource )
        , getUniqueId: function() {
            return this.getRootResoure().getId();
        }


        // only called on the root resource
        , getId: function() {
            return ++this._id;
        }

        /*
         * return the query object
         */
        , getQuery: function() {
            return this.query;
        }


        /*
         * set the query object
         */
        , setQuery: function(query) {
            this.query = query;
        }


        /*
         * create a new query
         */
        , createQuery: function() {
            return new Query();
        }


        /*
         * get the name for this enetity usedd in the query
         */
        , getAliasName: function() {
            return this.query.from+this.id;
        }


        /*
         * prepare the rootresource
         *
         * @param <Boolean> isSubQuery is this query part of the select statement of another query?
         * @param <Boolean> skipSelect ?
         */
        , prepare: function(skipSelect, isSubQuery) {

            // abort when the query was prepared alreay
            if (this._isPrepared) return;

            // for the root resource only
            if (!this.isRootResource()) throw new Error('You cannot prepare a childreource!');


            // mark as prepared
            this._isPrepared = true;

            // emit event for extensions
            this._emitEvent('beforePrepare', this, this.getDefinition());


            // check for advanced query builders, invoke them on myself
            this._invokeAdvancedQueryBuilders();

            // remove nils, fix some edge cases when a left join is used
            // and the user searches on nullable columns.
            this.processNilProblem(this.getAliasName(), this.getQuery().filter);


            // we need the primary keys on the root query
            if (!isSubQuery) this.selectPrimaryKeys();


            // prepare all children, add their filters & ordering to the root query
            this._prepareChildrenForRootResource(this);

            // prepare selction of child resources
            if (!skipSelect && !isSubQuery) this._selectChildren(this);

            // if we're joining tables we need to group by the primaries
            // of the root table, but only if no one added another grou statement
            this.addDefaultGrouping();

            // emit event for extensions
            this._emitEvent('afterPrepare', this, this.getDefinition());
        }


        /*
         * invoke advanced query builders o that they can apply
         * their filters to the query
         */
        , _invokeAdvancedQueryBuilders: function() {
            if (this.advancedQueryQuerybuilders) {
                this.advancedQueryQuerybuilders.forEach(function(qb) {
                    qb.apply(this.query.filter, this.queryBuilder);
                }.bind(this));
            }
        }


        /*
         * check which children must be selected. this means to select
         * all parents if required.
         */
        , _selectChildren: function(resource) {
            if (resource.hasChildren()) {

                // prepare all children
                resource.getChildren().forEach(function(childResource) {
                    childResource.prepareSubqueries();
                    this._selectChildren(childResource);
                }.bind(this));
            }
        }



        /*
         * prepare the children for the root resource
         * add root filter, ordering
         */
        , _prepareChildrenForRootResource: function(resource) {
            //log.highlight('%s hasChildren: %s', resource.name, resource.hasChildren());

            // find leaf nodes, prepare the root with all children
            if (resource.hasChildren()) {
                resource.getChildren().forEach(function(childResource) {

                    // add selects, joins and filters to the root query
                    childResource.prepareRootQuery();

                    // go up the tree
                    this._prepareChildrenForRootResource(childResource);
                }.bind(this));
            }


            // we need to apply our filter to all parent queries
            // execpt for the root resource (thats happened already
            // using the prepareRootQuery method).
            // all subselects need to be filtered in the same way as
            // their children are filtered
            if (resource.hasFiltersForTheRootResource() && resource.hasParent() && !resource.getParent().isRootResource()) {
                if (debug) log.warn('%s has filters for the root resource, adding them to all parents ...', resource.name);
                this.applyFiltersToParents(resource.getParent(), resource, [], resource);
            }
        }




        /*
         * mark a relating set for loading
         */
        , loadRelatingSet: function(name) {
            this.relatingSets[name] = true;
        }



        /*
         * check if this resource is selected, if yes, make sure all
         * parents are selected using their primary keys.
         */
        , prepareSubqueries: function() {
            var parent, parentFilter, filter;


            if (this.isSelected() && !this.selectApplied()) {
                parent = this.getParent();

                // emit event for extensions
                this._emitEvent('beforePrepareSubqueries', this, this.getDefinition());

                // indicate that this resource was already prepared
                this.selectApplied(true);

                // make sure our pks are selected
                this.selectPrimaryKeys();


                // select the parent referenced field
                if (this.referencedParentColumn) {
                    this.query.select.push(ORM.alias('____id____', this.referencedParentTable, this.referencedParentColumn));

                    // if this table is a reference from the parent to this table
                    // we need to copy the filter of the parent to our query, else we will
                    // load a shitload of records without any use for them
                    // this is a desing flaw and a hack :(
                    parentFilter = parent.getQuery().filter[this.referencedParentTable];

                    if (parentFilter) {
                        if (!this.getQuery().filter[this.referencedParentTable]) this.getQuery().filter[this.referencedParentTable] = {};
                        filter = this.getQuery().filter[this.referencedParentTable];

                        Object.keys(parentFilter).forEach(function(key) {
                            filter[key] = parentFilter[key];
                        }.bind(this));
                    }
                }
                else this.query.select.push(ORM.alias('____id____', this.referencedParentTable, this.referencedParentColumn));


                if (parent) {
                    // make sure the parent is selected
                    if (!parent.isSelected()) {
                        // select referenced column if required
                        if (this.referencedParentColumn) parent.selectColumn(this.referencedParentColumn);

                        // prepare parents
                        parent.prepareSubqueries();
                    }
                    else {
                        // select referenced column if required
                        if (this.referencedParentColumn) parent.selectColumn(this.referencedParentColumn);
                    }
                }


                // emit event for extensions
                this._emitEvent('afterPrepareSubqueries', this, this.getDefinition());
            }
        }




        /*
         * apply my filters to all parents except for the root resource
         * this is used to filter all subselects
         *
         * @param <Object> the current target resource -> a parent of of the sourceResource, may be null
         * @param <Object> sourceResource, the resource this process was started on
         * @apram <Array> an array containng all joins starting at the sourceResource to the current resource
         * @param <Object> lastTargetResource, the direct parent of the currentTargetResource, may be null
         */
        , applyFiltersToParents: function(currentTargetResource, sourceResource, joins, lastTargetResource) {
            var   name   = sourceResource.query.from
                , filter = currentTargetResource.query.filter;


            if (debug) log.debug('[%s] applying filters on %s to the parent %s ...'.yellow, sourceResource.name, sourceResource.name, currentTargetResource.name);


            // should we add the joins of the parent? look on the current
            // resource if the joins of the parents were added already
            // aka: do we need to add the join from the parent to this resource?
            if (!currentTargetResource._appliedJoins[lastTargetResource.name]) {
                if (debug) log.debug('[%s] adding sub-join from %s to %s ...'.cyan, sourceResource.name, lastTargetResource.name, currentTargetResource.name);

                currentTargetResource._appliedJoins[lastTargetResource.name] = true;
                joins = lastTargetResource.joins.slice().reverse().concat(joins);
            }



            // make sure there is an object to write to
            if (!filter[name]) filter[name] = {};

            // apply the filters from the source to the current target
            Object.keys(sourceResource.getFilter()).forEach(function(key){
                filter[name][key] = sourceResource.filters[key];
            });


            // apply all collected joins to the target
            joins.forEach(function(joinStatement) {
                currentTargetResource.query.join.push(joinStatement.reverseFormat());
            }.bind(this));


            // we need to add ou filter and joins to all branches sourcing from here
            this._joinAndFilterSideTree(name, sourceResource.getFilter(), joins, currentTargetResource, lastTargetResource);


            // is there a non root parent?
            if (currentTargetResource.hasParent() && !currentTargetResource.getParent().isRootResource()) {
                this.applyFiltersToParents(currentTargetResource.getParent(), sourceResource, joins, currentTargetResource);
            }
        }


        /*
         * add filters to side branches
         */
        , _joinAndFilterSideTree: function(sourceName, filters, joins, resource, parentResource) {
            if (resource && resource.hasChildren()) {
                resource.getChildren().forEach(function(childResource) {
                    if (childResource.name !== sourceName && (!parentResource || parentResource.name !== childResource.name)) {
                        //log.warn('%s applying itself to %s; %s', sourceName, childResource.name, parentResource ? parentResource.name : undefined, filters);

                        // make sure there is an object to write to
                        if (!childResource.query.filter[sourceName]) childResource.query.filter[sourceName] = {};

                        Object.keys(filters).forEach(function(key){
                            childResource.query.filter[sourceName][key] = filters[key];
                        });

                        // take the joins, apply them to the parent
                        joins.forEach(function(joinStatement) {
                            childResource.query.join.push(joinStatement.reverseFormat());
                        }.bind(this));

                        // go down the branch
                        this._joinAndFilterSideTree(sourceName, filters, joins, childResource, resource);
                    }
                }.bind(this));
            }
        }



        /*
         * add my own pks to the select statement
         */
        , selectPrimaryKeys: function() {
            this.Model.definition.primaryKeys.forEach(function(fieldName){
                if (this.query.select.indexOf(fieldName) === -1 && this.query.select.indexOf('*') === -1) this.query.select.push(fieldName);
            }.bind(this));
        }



        /*
         * group by primary keys
         */
        , groupByPrimaryKeys: function() {
            this.Model.definition.primaryKeys.forEach(function(fieldName){
                this.query.group.push({
                    table: this.name
                    , column: fieldName
                });
            }.bind(this));
        }


        /**
         * group the query by the primary ids if we got joins but no
         * other group stements
         */
        , addDefaultGrouping: function() {
            if (!this.query.group.length && this.query.join.length && this._queryMode === this.MODE_SELECT && !this._countingQuery) {
                this.Model.definition.primaryKeys.forEach(function(fieldName) {
                    this.query.group.push({
                          table     : this.getAliasName()
                        , column    : fieldName
                    });
                }.bind(this));


                this.query.order.forEach(function(order) {
                    if (!order.noGroup) {
                        this.query.group.push({
                              table     : order.entity
                            , column    : order.property
                        });
                    }
                }.bind(this));
            }



            // add orderign columsn to the group by statement, if present
            if (this.query.group && this.query.group.length && this.query.order && this.query.order.length) {
                this.query.order.forEach(order => {

                    // dont add order statement that have no entity, they are 
                    // computed and cannot be grouped
                    if (order.entity && !this.query.group.some(group => group.table === order.entity && group.column === order.property)) {
                        this.query.group.push({
                              table: order.entity
                            , column: order.property
                        });
                    }
                });
            }
        }


        /*
         * indicates if this resource was selected by the user
         */
        , isSelected: function() {
            return !!this.query.select.length;
        }



        /*
         * select a column on this resource
         */
        , selectColumn: function(columnName) {//
            this.getQuery().select.push(columnName);
        }



        /*
         * filter a resource by the ids of my primarykey
         * thi is called on the root resource only and
         * only after the root query was executed (so there
         * is a set witrh ids)
         */
        , applyFilter: function(resource) {
            const configResource = this.getFilterConfigResource(resource);
            const q = resource.query;

            //log(resource, configResource);
            if (!q.filter) q.filter = {};


            switch (configResource.type) {

                case 'reference':
                    if (!q.filter[configResource.targetModel]) q.filter[configResource.targetModel] = {};

                    const referenceIds = this.set.map(item => item[configResource.referencedParentColumn]);
                    q.filter[configResource.targetModel][configResource.targetColumn] = ORM.in(referenceIds);
                    break;


                case 'belongsTo': 
                    if (!q.filter[configResource.targetModel]) q.filter[configResource.targetModel] = {};

                    const belongsToIds = this.set.map(item => item[configResource.referencedParentColumn]);
                    q.filter[configResource.targetModel][configResource.targetColumn] = ORM.in(belongsToIds);
                    break;


                case 'mapping':
                    if (!q.filter[configResource.targetModel]) q.filter[configResource.targetModel] = {};

                    const mappingIds = this.set.map(item => item[this.primaryKeys[0]]);
                    q.filter[configResource.targetModel][configResource.targetColumn] = ORM.in(mappingIds);
                    break;
            }
        }





        , getFilterConfigResource(resource) {
            return (resource.parentResource && resource.parentResource.parentResource) ? this.getFilterConfigResource(resource.parentResource) : resource;
        }




        /*
         * group a resource by my primarykeys, this is used by the
         * querycompiler
         */
        , applyGroup: function(resource) {
            this.primaryKeys.forEach(function(pk) {
                resource.query.group.push({
                      table     : this.name
                    , column    : pk
                });
            }.bind(this));
        }


        /*
         * prepare for for counting, remove existing selects
         * add a count(*) select
         */
        , prepareCounting: function(column) {
            if (!column) column = this.primaryKeys[0];

            this.query.select = [ORM.count(column, 'rowCount')];
        }


        /*
         * prepare the root query based on the configuration of this
         * resource. this function calls the parent until it reaches
         * the root resource. applies filters, selects, orders.
         * this method is called on each of the children of the root
         * resource, so we need to check what was already joined and
         * what not.
         */
        , prepareRootQuery: function() {
            if (this.hasFiltersForTheRootResource()) {
                // we have some filters that must be applied to the root
                // query
                this.addJoinsToRootResource(true);

                // apply filters all the way up to the root resource
                this.addFiltersToRootResource();
            }


            if (this._forceJoin) {

                // we need to join this table, because the user said so
                this.addJoinsToRootResource(this._forceLeftJoin);
            }


            if (this.hasOrderingForTheRootResource()) {
                // we have some ordering that must be applied to the root
                // query, do left joins
                this.addJoinsToRootResource(true);

                // apply orderings all the way up to the root resource
                this.addOrderingToRootResource();
            }


            //if (this.hasGroupingForTheRootResource()) {
                // to do
            //}
        }



        /**
         * checks if there is a null filter on any column, if
         * yes it wraps it in an and structure and adds a filter
         * that queries for a not nullable column for a not null
         * value.
         * in a second step a search for a nil fitler is executed.
         * nil is the equivalent of a not existing column. it gets
         * replaced by a filter for a column that is not nullable
         * on the same entity.
         */
         , processNilProblem: function(entityName, filters) {
             if (type.array(filters)) {
                 filters.forEach(function(item) {
                     this.processNilProblem(entityName, item);
                 }.bind(this));
             }
             else if (type.object(filters)) {
                 Object.keys(filters).forEach(function(key) {
                     var columnName;

                     if (type.array(filters[key]) || type.object(filters[key])) this.processNilProblem((key !== '_' ? key : entityName), filters[key]);
                     else if (entityName !== this.getAliasName()) {
                         // dont modify filters on the root resource

                         if (filters[key] === null) {
                             columnName = this.getNonNullableColumnName(entityName);

                             // there it is, add a filter on a non nullable column
                             if (filters[columnName]) filters[columnName] = ORM.and(filters[columnName], ORM.notNull());
                             else filters[columnName] = ORM.notNull();
                         }
                         else if (filters[key] === ORM.nil) {
                             columnName = this.getNonNullableColumnName(entityName);

                             // filter for null on a non nullable column
                             if (filters[columnName]) filters[columnName] = ORM.and(filters[columnName], null);
                             filters[columnName] = null;
                             delete filters[key];
                         }
                     }
                 }.bind(this));
             }
         }




        /**
         * gets the first non nullable column for a table.
         * ttries to get the first matching table name by removing
         * trailign numbers
         *
         * @param {string} onEntity the entity to look for non nullables
         *
         * @returns {string|undefined} the column or undefined
         */
        , getNonNullableColumnName: function(onEntity) {
            var   db = this.queryBuilder._getDatabase()
                , columns
                , nonNullableColumnName;

            if (!db[onEntity]) {
                if (/\d+$/.test(onEntity)) return this.getNonNullableColumnName(onEntity.slice(0, -1));
                else throw new Error('Cannot get non nullable column on entity «'+onEntity+'», the entity does not exist!');
            }
            else columns = db[onEntity].getDefinition().columns;

            Object.keys(columns).some(function(columnName) {
                if (!columns[columnName].nullable) {
                    nonNullableColumnName = columnName;
                    return true;
                }
            }.bind(this));

            return nonNullableColumnName;
        }





        /*
         * if this resource has ordering for the root query
         */
        , hasOrderingForTheRootResource: function() {
            return !!this.order.length;//!!this._hasRootOrdering;
        }


        /*
         * if this resource has filters for the root query
         */
        , hasFiltersForTheRootResource: function() {
            return !!this._hasRootFilters;
        }


        /*
         * add the ordering to the root resource, do this also
         * for all parent resources
         */
        , addOrderingToRootResource: function() {
            if (!this.isRootResource() && !this.orderingApplied()) {
                // apply ordering to root
                this.applyOrdering(this.getRootResoure());

                // do the same on my parent
                this.getParent().addOrderingToRootResource();
            }
        }


        /*
         * apply local ordering to the root resource
         */
        , applyOrdering: function(targetResource) {
            this.order.forEach(function(instruction) {
                targetResource.getQuery().order.push({
                      entity    : instruction.entity || this.name+(this.id ? this.id : '')
                    , property  : instruction.property
                    , desc      : instruction.desc
                    , priority  : instruction.priority
                    , byArray   : instruction.byArray
                });
            }.bind(this));
        }



        /*
         * add the all filters to the root resource, do this also
         * for all parent resources
         */
        , addFiltersToRootResource: function() {
            if (!this.isRootResource() && !this.filterApplied()) {
                // apply filters to root
                this.applyFilters(this.getRootResoure());

                // do the same on my parent
                this.getParent().addFiltersToRootResource();
            }
        }


        /*
         * apply local filters to the root resource
         */
        , applyFilters: function(targetResource) {
            var   name = this.query.from+this.id
                , targetFilter;

            // mke sure there is an object to write to
            if (!targetResource.query.filter[name]) targetResource.query.filter[name] = {};

            // normal filters
            if (this.filters && Object.keys(this.filters).length) {
                targetFilter = targetResource.query.filter[name];

                Object.keys(this.filters).forEach(function(key){
                    targetFilter[key] = this.filters[key];
                }.bind(this));
            }

            // mark as applied
            this.filterApplied(true);
        }


        /*
         * add the current joins statment to the root query, call the
         * same method on all parents until we're at the root resource
         * itself
         */
        , addJoinsToRootResource: function(leftJoin) {
            if (!this.isRootResource() && !this.joinApplied()) {
                if (debug) log.info('Applying join from %s to %s ...'.magenta, this.name, this.getParent().name);

                // do the same on my parent
                this.getParent().addJoinsToRootResource(leftJoin);

                // apply joins to root
                this.applyJoins(this.getRootResoure(), leftJoin);
            }
        }



        /*
         * apply joins needed for working on this resource to the
         * targetResource resource
         */
        , applyJoins: function(targetResource, leftJoin) {

            this.joins.slice().reverse().forEach(function(joinStatement, index) {
                targetResource.query.join.push(joinStatement.reverseFormat(this.id, (index > 0 ? this.id: this.getParent().id), leftJoin));
            }.bind(this));

            // mark as used
            this.joinApplied(true);
        }


        /*
         * returns the definition of the current model
         */
        , getDefinition: function() {
            return this.Model.definition;
        }


        /*
         * flags that this resource was joined already
         */
        , joinApplied: function(status) {
            if (status !== undefined) this._joinApplied = status;
            return this._joinApplied;
        }

        /*
         * flags that this resource was selected already
         */
        , selectApplied: function(status) {
            if (status !== undefined) this._selectApplied = status;
            return this._selectApplied;
        }


        /*
         * flags that this resource was ordered already
         */
        , orderingApplied: function(status) {
            if (status !== undefined) this._orderingApplied = status;
            return this._orderingApplied;
        }


        /*
         * flags that this resource was filtered already
         */
        , filterApplied: function(status) {
            if (status !== undefined) this._filterApplied = status;
            return this._filterApplied;
        }


        /*
         * returns the root resource (itself if its the root resource)
         */
        , getRootResoure: function() {
            return this.rootResource || this;
        }


        /*
         * returns if this is the root resource (this has no parents)
         */
        , isRootResource: function() {
            return !this.hasParent();
        }


        /*
         * returns if this resource has a parent
         */
        , hasParent: function() {
            return !!this.getParent();
        }


        /*
         * returns the resources parent, if avialable
         */
        , getParent: function() {
            return this.parentResource;
        }


        /*
         * return child resources
         */
        , getChildren: function() {
            return this.children;
        }


        /*
         * returns if this resource has children
         */
        , hasChildren: function() {
            return !!this.children.length;
        }




        /*
         * emit events used by extensions
         *
         * @param <String> the venet to emit
         */
        , _emitEvent: function(event) {
            var   listeners = this._extensionEventListeners[event] ? this._extensionEventListeners[event].concat(this.listener(event)) : this.listener(event)
                , args      = [];



            // are there any event listeners?
            if (listeners && listeners.length) {

                // let v8 optimize this
                for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);


                listeners.forEach(function(listener){
                    listener.apply(undefined, args);
                });
            }
        }
    });
})();
