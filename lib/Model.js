!function(){

    var   Class         = require('ee-class')
        , Arguments     = require('ee-arguments')
        , async         = require('ee-async')
        , EventEmitter  = require('ee-event-emitter')
        , type          = require('ee-types')
        , log           = require('ee-log')
        , Query         = require('./Query')
        , clone         = require('./clone')
        , ORM;





    module.exports = new Class({
        inherits: EventEmitter


        // dont create a neested set ionstance if not really used
        // the nested set implementation handles all nested set 
        // specific behaviour
        , _nestedSet: {
            get: function() {
                if (!this.__nestedSet) {
                    this.__nestedSet = new NestedSet({

                    });
                }

                return this.__nestedSet;
            }
        }


        , _nestedSetConfig: {
            get: function() {
                if (!this.__nestedSetConfig)  Class.define(this, '__nestedSetConfig', Class({}));
                return this.__nestedSetConfig;
            }
        }


        , init: function(options) {
            Class.define(this, '_defintion'         , Class(options.definition));
            Class.define(this, '_orm'               , Class(options.orm));

            Class.define(this, '_values'            , Class({}));
            Class.define(this, '_changedValues'     , Class([]));
            Class.define(this, '_mappings'          , Class({}));
            Class.define(this, '_belongsTo'         , Class({}));
            Class.define(this, '_references'        , Class({}));
            Class.define(this, '_changedReferences' , Class([]));
            Class.define(this, '_mappingIds'        , Class([]));
            Class.define(this, '_hasChanges'        , Class(false).Writable());
            Class.define(this, '_relatingSets'      , Class(options.relatingSets));
            Class.define(this, '_getDatabase'       , Class(options.getDatabase));
            Class.define(this, '_fromDb'            , Class(options.isFromDB || false).Writable());
            Class.define(this, '_set'               , Class(options.set)); // the set this record is contained

            // require the orm if not already set, cannot load at 
            // the begin of the file because the orm includes this file
            if (!ORM) ORM = require('./ORM');

            // 

            // check for changes
            //this.on('change', this._setChanged.bind(this));

            if (options.parameters) this._setValues(options.parameters);
        }



        /*
         * set a new node as parent, the node may be added at the
         * top or at the end of that level. the parent argument may
         * be either an instance of a model or an id. if the parentNode
         * paramter is null or undefined we assume your going to set this
         * node as a new root node (this will create new tree)
         */
        , setParentNode: function(parentNode, asLastNode, filter) {
            if (parentNode === undefined || parentNode === null) {
                this._nestedSetConfig.parentNode = true;
                this._handleNestedSetFilter(filter);
                this[this._defintion.nestedSetLeft] = 1;
                this[this._defintion.nestedSetRight] = 2;
            }
            else {
                this._checkNestedSetInput(parentNode);
                this._handleNestedSetFilter(filter);
                this._nestedSetConfig.parentNode    = parentNode;
                this._nestedSetConfig.asLastNode    = !!asLastNode;
            }

            return this;
        }


        /*
         * set a new node as prior node (same level). the parent
         * argument may be either an instance of a model or an id.
         */
        , moveNode: function(referenceNode, beforeNewNode, filter) {
            this._checkNestedSetInput(priorNode);
            this._handleNestedSetFilter(filter);

            this._nestedSetConfig.referenceNode     = referenceNode;
            this._nestedSetConfig.beforeNewNode     = !!beforeNewNode;

            return this;
        }


        /*
         * check for correct input for nested set functions
         */
        , _checkNestedSetInput: function(node) {
            if (!this._defintion.isNestedSet) throw new Error('Cannot updte nested set parameters, the model «'+this.getEntityName()+'» is not a nested set. check your db strucutre and the db configuration.');
            if (!type.number(node)) {
                if (!type.function(node.isModel) && !type.function(node.isQuery)) throw new Error('Cannot add item typeof «'+type(node.isModel)+'» as parentNode! Expected integer or «'+this.getEntityName()+'» model.');
                if (node.getEntityName() !== this.getEntityName())  throw new Errro('Cannot add «'+node.getEntityName()+'» model as parentNode of a «'+this.getEntityName()+'» model! Expected integer or «'+this.getEntityName()+'» model.');
            }
        }

        /*
         * check if the nested set filter is valid, make valid filter object 
         */
        , _handleNestedSetFilter: function(filter) {
            this._nestedSetConfig.filter = {};

            if (type.string(filter)) {
                if (this._columns[filter]) {
                    if (type.undefined(this[filter])) throw new Error('The nested set «'+this.getEntityName()+'» can not filter the using the column «'+filter+'», the current model has no value set on the column!');

                    this._nestedSetConfig.filter[this._defintion.getTableName()] = {};
                    this._nestedSetConfig.filter[this._defintion.getTableName()][filter] = this[filter];
                }
            }
            else if (!type.undefined(filter) && !type.null(filter)) throw new Error('The nested set «'+this.getEntityName()+'» cannot accept a filter typeof «'+type(filter)+'»!');
        }



        , _setChanged: function() {
            this._hasChanges = true;
        }


        , getDefinition: function() {
            return this._defintion;
        }

        , getPrimaryKeys: function() {
            return this._defintion.primaryKeys;
        }


        , isModel: function() {
            return true;
        }


        , getEntityName: function() {
            return this._defintion.name;
        }


        , _setValues: function(values){
            if (!type.undefined(values) && !type.object(values)) throw new Error('expecting an object contining value sfor a new model instance, got «'+type(values)+'»!');
            
            Object.keys(values).forEach(function(property){
                var item = values[property];

                if (type.object(item) && this._addQueryObject(property, item)) return;
                else if (type.array(item)) {
                    item.forEach(function(obj){
                        if (type.object(obj) && this._addQueryObject(property, obj)) return;
                        else throw new Error('Expected a Query or a Model for the key «'+property+'»!');
                    }.bind(this));
                }
                else if (property === '____id____') this._mappingIds.push(item);
                else this._values[property] = item;
            }.bind(this));
        }



        , _addQueryObject: function(propertyName, item) {
            var name = propertyName;

            if (type.object(item) && !type.null(item) && ((item.isModel && item.isModel()) || item.isQuery)) {
                // we got a model
                // name = item.getEntityName();
                // log.wtf(name, this._columns[name].type);

                if (this._columns[name] && (this._columns[name].type === 'mapping' || this._columns[name].type === 'belongsTo')) this[name].push(item);
                else if (this._columns[name] && this._columns[name].type === 'reference') this[name] = item;
                else if (this._genericAccessors[name]) throw new Error('Cannot add «'+name+'» model to «'+this.getEntityName()+'» model! please use the generic accessor!');
                else throw new Error('Cannot create a relation between the «'+name+'» and «'+this.getEntityName()+'» models! there is no relation between the two models!');      
                return true;            
            }
            return false;
        }






        , loadAll: function(callback){
            return this.reload(callback);
        }


        , isFromDatabase: function(){
            return this._fromDb;
        }


        , isSaved: function() {
            this.isFromDatabase() && !this._hasChanges;
        }


        , reload: function(callback, transaction){
            if (!this.isFromDatabase()) return callback(new Error('Cannot reload record «'+this.getEntityName()+'» without saving it first!'));

            var query = {
                  select    : ['*']
                , from      : this._defintion.getTableName()
                , database  : this._defintion.getDatabaseName()
                , filter    : {}
            };

            callback = callback || function(){};


            this._defintion.primaryKeys.forEach(function(key){
                query.filter[key] = this[key];
            }.bind(this));

            (transaction || this._getDatabase()).executeQuery(query, function(err, data){
                if (err) callback(err);
                else {
                    if (!data.length) callback(new Error('Failed to load data from database, record doesn\'t exist!'));
                    else {
                        this._setValues(data[0]);
                        this._fromDb = true;

                        this._reloadRelated(function(err){
                            callback(err, this);
                        }.bind(this), transaction);
                    }
                }
            }.bind(this));

            return this;
        }


        , _reloadRelated: function(callback, transaction) {
            async.each(Object.keys(this._mappings), function(keyName, next){
                this._mappings[keyName].reload(next, transaction);
            }.bind(this), callback);
/*
            Object.keys(this._belongsTo).forEach(function(keyName){
                
            }.bind(this));

            Object.keys(this._references).forEach(function(keyName){
                
            }.bind(this));*/
        }



        , _getChangedValues: function() {
            var data = {};

            this._changedValues.forEach(function(key){
                data[key] = this[key];
            }.bind(this));

            return data;
        }





        , delete: function() {
            var   args          = new Arguments(arguments)
                , callback      = args.getFunction(function(){})
                , transaction   = args.getObject()
                , hardDelete    = args.getBoolean(false); 

            if (transaction) {
                this._delete(transaction, hardDelete, callback);
            }
            else {
                transaction = this._getDatabase().createTransaction();

                this._delete(transaction, hardDelete, function(err){
                    if (err) {
                        transaction.rollback(function(transactionErr){
                            if (transactionErr) callback(transactionErr);
                            else callback(err);
                        }.bind(this));
                    }
                    else {
                        transaction.commit(function(err){
                            if (err) callback(err);
                            else {
                                this._deleted = true;
                                this._fromDb = false;
                                this.emit('delete', this);
                                callback(null, this);
                            }
                        }.bind(this));
                    }
                }.bind(this));
            }

            return this;
        }




        , _delete: function(transaction, hardDelete, callback) {

            var query = {
                  from      : this._defintion.getTableName()
                , database  : this._defintion.getDatabaseName()
                , filter    : {}
            };

            // cannot delete a model not loaded from the database
            if (this._fromDb){
                this._defintion.primaryKeys.forEach(function(key){
                    query.filter[key] = this[key];
                }.bind(this));

                if (!Object.keys(query.filter).length) {
                    log.dir(query);
                    throw new Error('Failed to create proper delete query for model «'+this.getEntityName()+'», no filter was created (see query definition above)');
                }
                else {
                    // soft delete?
                    if (!hardDelete && this._defintion.deletedTimestamp) {
                        query.values = {};
                        query.values[this._defintion.deletedTimestamp] = process.env.ORM_TIMESTAMP_VALUE ? new Date(process.env.ORM_TIMESTAMP_VALUE) : new Date();
                        
                        this.emit('beforeDelete', this, true);
                        this._emitOnCommit(transaction, 'afterDeleteCommit', this, true);
                        transaction.executeQuery('update', query, callback);
                    }
                    else {
                        this.emit('beforeDelete', this);
                        this._emitOnCommit(transaction, 'afterDeleteCommit', this);
                        transaction.executeQuery('delete', query, callback);
                    }
                }
            }
            else callback(new Error('Cannot delete model «'+this.getEntityName()+'», it wasn\'t loaded from the database!'));
        }



        /*
         * emits a specifc event when a transaction is commited successfull
         */
        , _emitOnCommit: function(transaction, event) {
            transaction.once('commit', function(){
                this.emit.apply(this, [event].concat(Array.prototype.slice.call(arguments, 2)));
            }.bind(this));
        }

/*
        , clone: function() {
            var clonedInstance = new (this._getDatabase()[this._defintion.model.name])();

            
        }
*/


        , save: function() {
            var   args          = new Arguments(arguments)
                , callback      = args.getFunction(function(){})
                , noReload      = args.getBoolean(false)
                , transaction   = args.getObject();

            // transactio management
            if (transaction) {
                this._save(transaction, noReload, callback);
            }
            else {
                transaction = this._getDatabase().createTransaction();
                this._save(transaction, noReload, function(err){
                    if (err) {
                        transaction.rollback(function(transactionErr){
                            if (transactionErr) callback(transactionErr);
                            else callback(err);
                        }.bind(this));
                    }
                    else {
                        transaction.commit(function(err){
                            if (err) callback(err);
                            else {
                                
                                this.reload(function(err){
                                    if (err) callback(err);
                                    else callback(null, this);
                                }.bind(this));
                            }
                        }.bind(this));
                    }
                }.bind(this));
            }

            return this;
        }



        /*
         * add a new item to the nested set
         */
        , _insertIntoNestedSet: function(transaction, callback) {
            this._prepareNestedSetTransaction(transaction, function(err, options) {
                var wait;

                if (err) callback(err);
                else if (!options) callback();
                else {
                    wait = async.waiter(callback);


                    // check where to place the new node
                    if (this._nestedSetConfig.parentNode === true) {
                        // new root node
                        if (this._nestedSetConfig.asLastNode && options.newNode) this[options.left] = options.newNode[options.right] + 1;
                        else this[options.left] = 1;
                    }
                    else if (this._nestedSetConfig.parentNode) {
                        // as child into a parentnode
                        if (!options.newNode) return callback(new Error('Failed to retreive the target node for the nested set «'+this.getEntityName()+'»!'));
                        else if (this._nestedSetConfig.asLastNode) this[options.left] = options.newNode[options.right]-2;
                        else this[options.left] = options.newNode[options.left]+1;
                    }
                    else {
                        // somewhere after or before another node
                        if (this._nestedSetConfig.beforeNewNode) this[options.left] = options.newNode[options.left]-2;
                        else this[options.left] = options.newNode[options.right]+1;                      
                    }
                    // set right position
                    this[options.right] = this[options.left]+1;
                    //log.wtf(this.name, this[options.left], this[options.right]);
                    //if (options.newNode) options.newNode.dir();

                    // move all items to the right 
                    this._orm[options.databaseName][options.entityName](this._mergeNestedSetFilter(clone(this._nestedSetConfig.filter), options.left, ORM.gte(this[options.left]))).update(this._buildObject(options.left, ORM.increaseBy(2)), wait(), options.transaction);
                    this._orm[options.databaseName][options.entityName](this._mergeNestedSetFilter(clone(this._nestedSetConfig.filter), options.right, ORM.gte(this[options.left]))).update(this._buildObject(options.right, ORM.increaseBy(2)), wait(), options.transaction);
                }
            }.bind(this));
        }


        /*
         * update nested set stuff after the model was saved
         * this must be run in a separate transaction since 
         * mysql isn't all too flexible with table locking (it sucks)
         */
        , _updateNestedSet: function(transaction, callback) { log.wtf('möving');
            this._prepareNestedSetTransaction(transaction, function(err, options) { log(options);
                var   moveValues        = {}
                    , width
                    , filter
                    , moveFilter
                    , distance
                    , tempLeftPosition
                    , newLeftPosition
                    , wait;

                if (err) callback(err);
                else if (!options) callback();
                else {
                    width             = this[options.right] - this[options.left] + 1;
                    filter            = this._nestedSetConfig.filter;
                    moveFilter        = clone(filter);
                    
                    // when all element are moved we shoudl set our new position
                    wait = async.waiter(callback);

                    // get the new left position
                    if (this._nestedSetConfig.parentNode === true) {
                        // new root node
                        if (this._nestedSetConfig.asLastNode && options.newNode) newLeftPosition = options.newNode[options.right] + 1;
                        else newLeftPosition = 1;
                    }
                    else if (this._nestedSetConfig.parentNode) {
                        // as child of a parentnode
                        if (!options.newNode) return callback(new Error('Failed to retreive the target node for the nested set «'+this.getEntityName()+'»!'));
                        else if (this._nestedSetConfig.asLastNode) newLeftPosition = options.newNode[options.right]-width;
                        else newLeftPosition = options.newNode[options.left]+1;
                    }
                    else {
                        // somewhere after or before another node
                        if (this._nestedSetConfig.beforeNewNode) newLeftPosition = options.newNode[options.left]-width;
                        else newLeftPosition = options.newNode[options.right]+1;                      
                    }

                    // position calculations
                    distance            = newLeftPosition - this[options.left];
                    tempLeftPosition    = this[options.left];

                    if (distance < 0) {
                        distance            -= width;
                        tempLeftPosition    += width;
                    }


                    // create new space for subtree
                    this._orm[options.databaseName][options.entityName](this._mergeNestedSetFilter(clone(filter), options.left, ORM.gte(newLeftPosition))).update(this._buildObject(options.left, ORM.increaseBy(width)), wait(), options.transaction);
                    this._orm[options.databaseName][options.entityName](this._mergeNestedSetFilter(clone(filter), options.right, ORM.gte(newLeftPosition))).update(this._buildObject(options.right, ORM.increaseBy(width)), wait(), options.transaction);

                    // move subtree into new space
                    this._mergeNestedSetFilter(moveFilter, options.left, ORM.gte(tempLeftPosition));
                    this._mergeNestedSetFilter(moveFilter, options.right, ORM.lt(tempLeftPosition+width));
                    moveValues[options.left] = ORM.increaseBy(distance);
                    moveValues[options.right] = ORM.increaseBy(distance);
                    this._orm[options.databaseName][options.entityName](moveFilter).update(moveValues, wait(), options.transaction);

                    // remove old space vacated by subtree
                    this._orm[options.databaseName][options.entityName](this._mergeNestedSetFilter(clone(filter), options.left, ORM.gt(this[options.right]))).update(this._buildObject(options.left, ORM.decreaseBy(width)), wait(), options.transaction);
                    this._orm[options.databaseName][options.entityName](this._mergeNestedSetFilter(clone(filter), options.right, ORM.gt(this[options.right]))).update(this._buildObject(options.right, ORM.decreaseBy(width)), wait(), options.transaction);
                }
            }.bind(this));
        }



        /*
         * prepare everything required for executing a nested set operation
         */
        , _prepareNestedSetTransaction: function(transaction, callback) {
            var   databaseName
                , entityName;

            if (this._defintion.isNestedSet && this._nestedSetConfig && (this._nestedSetConfig.parentNode || this._nestedSetConfig.referenceNode)) {
                databaseName    = this._defintion.getDatabaseName();
                entityName      = this.getEntityName();

                // lock the table, so we're not going to have conflicts
                transaction.lock(this.getEntityName(), transaction.LOCK_EXCLUSIVE, function(err) {
                    if (err) callback(err);
                    else {
                        this._getNestedSetTargetNode((this._nestedSetConfig.parentNode || this._nestedSetConfig.referenceNode), transaction, databaseName, entityName, function(err, newNode) {
                            if (err) callback(err);
                            else {
                                callback(null, {
                                      transaction   : transaction
                                    , newNode       : newNode
                                    , left          : this._defintion.nestedSetLeft
                                    , right         : this._defintion.nestedSetRight
                                    , databaseName  : databaseName
                                    , entityName    : entityName
                                });
                            }
                        }.bind(this));
                    }
                }.bind(this));
            }
            else callback();
        }


        /*
         * creates an object from a propertyname and value
         */
        , _buildObject: function(property, value) {
            var obj = {};
            obj[property] = value;
            return obj;
        }


        /*
         * creates a copy of an exisitng filter, merges new 
         * values into it, based on the current model
         */
        , _mergeNestedSetFilter: function(filter, key, value) {
            if (!filter) filter = {};
            filter[key] = value;
            return filter;
        }


        /*
         * get the node targeted in the update of the nested set
         */
        , _getNestedSetTargetNode: function(node, transaction, databaseName, entityName, callback) {
            var   filter
                , query;

            if (type.number(node)) {
                filter = {};

                if (this._defintion.primaryKeys.length > 1) throw new Error('Cannot load nested set node on model «'+this.getEntityName()+'» with more than one primarykey, please report a feature request @github ;)');
                filter[this._defintion.primaryKeys[0]] = node;

                this._orm[databaseName][entityName](filter).findOne(function(err, newNode) {
                    if (err) callback(err);
                    else if (!newNode) callback(new Error('Nested set «'+this.getEntityName()+'» failed to load new parent / prior node'));
                    else callback(null, newNode);
                }.bind(this));
            }
            else if (type.boolean(node) && node === true) {
                // if we're adding the new roto node at the end we have to get the ast node of the tree
                if (this._nestedSetConfig.asLastNode) {
                    query = new Query({filter: this._nestedSetConfig.filter});
                    query.resetOrder().order.push({
                          property  : left
                        , desc      : !true
                        , priority  : 0
                    }).offset(null).limit(1);
                    transaction.executeQuery('query', query, callback);
                }
                else callback();
            }
            else if (type.object(node) && type.function(node.isQuery) && node.isQuery()) node.findOne(callback);
            else node.reload(callback, transaction);
        }




        , _save: function(transaction, noReload, outerCallback) {
            // make sure the model has a primary key
            if (!this._defintion.primaryKeys.length) throw new Error('Cannot save model «'+this.getEntityName()+'», primary key not found!');

            // this is a pretty unreliable event, ou are not going to know if the save is going to succeed
            this.emit('beforeSave', this);
            this._emitOnCommit(transaction, 'afterSaveCommit', this);

            // mkae sure the outer callback gets this model 
            // as second parameter
            var callback = function(err){
                if (err) outerCallback(err);
                else outerCallback(null, this);
            }.bind(this);

            // we need to change the status if the transaction succeeds
            transaction.once('commit', function(){
                this._fromDb = true;
                this._hasChanges = false;
                if (!noReload) this.reload();
            }.bind(this));

            // proceed to save
            this._saveReferences(transaction, noReload, function(err){
                if (err) callback(err);
                else {
                    var query = {
                          from      : this._defintion.getTableName()
                        , database  : this._defintion.getDatabaseName()
                        , filter    : {}
                        , values    : this._fromDb ? this._getChangedValues() : this._values
                    };

                    if (this._defintion.primaryKeys.length) {
                        query.returning = this._defintion.primaryKeys;
                    }

                    //log.error(this._defintion.getTableName());

                    if (this._fromDb){
                        this.emit('beforeUpdate', this);

                        if (this._changedValues.length) {
                            this._defintion.primaryKeys.forEach(function(key){
                                query.filter[key] = this[key];
                            }.bind(this));

                            if (this._defintion.updatedTimestamp) query.values[this._defintion.updatedTimestamp] = process.env.ORM_TIMESTAMP_VALUE ? new Date(process.env.ORM_TIMESTAMP_VALUE) : new Date();
                            
                            transaction.executeQuery('update', query, function(err){
                                if (err) callback(err);
                                else {
                                    this.emit('afterUpdate', this, true);
                                    this._emitOnCommit(transaction, 'afterUpdateCommit', this);

                                    this._saveChildren(transaction, noReload, function(err) {
                                        this.emit('afterSave', this, true);
                                        callback(err);
                                    }.bind(this));
                                }
                            }.bind(this));
                        }
                        else this._saveChildren(transaction, noReload, function(err) {
                            this.emit('afterSave', this, true);
                            callback(err);
                        }.bind(this));
                    }
                    else {
                        this.emit('beforeInsert', this);

                        if (this._defintion.updatedTimestamp) query.values[this._defintion.updatedTimestamp] = process.env.ORM_TIMESTAMP_VALUE ? new Date(process.env.ORM_TIMESTAMP_VALUE) : new Date();
                        if (this._defintion.createdTimestamp) query.values[this._defintion.createdTimestamp] = process.env.ORM_TIMESTAMP_VALUE ? new Date(process.env.ORM_TIMESTAMP_VALUE) : new Date();

                        this._insertIntoNestedSet(transaction, function(err) {
                            if (err) callback(err);
                            else {
                                transaction.executeQuery('insert', query, function(err, result) {
                                    if (err) callback(err);
                                    else {
                                        if (result.type === 'id') {                                    
                                            if(result.id) {
                                                if (this._defintion.primaryKeys.length === 1){
                                                    this[this._defintion.primaryKeys[0]] = result.id;
                                                }
                                                else throw new Error('Cannot load record with more than one primarykey when at least on of the primary keys has an autoincermented value!');
                                            }

                                            this.emit('afterInsert', this);
                                            this._emitOnCommit(transaction, 'afterInsertCommit', this);

                                            this._saveChildren(transaction, noReload, function(err) {
                                                this.emit('afterSave', this, true);
                                                callback(err);
                                            }.bind(this));
                                        }
                                        else throw new Error('not implemented!');
                                    }
                                }.bind(this));
                            }
                        }.bind(this));
                    }
                }
            }.bind(this));            
        }



        , _saveChildren: function(transaction, noReload, callback) {
            this.emit('beforeSaveChildren');

            async.wait(function(done) {
                this._saveMappings(transaction, noReload, done);
            }.bind(this)
            , function(done) {
                this._saveBelongsTo(transaction, noReload, done);
            }.bind(this), function(err){
                this.emit('afterSaveChildren');
                callback(err);
            }.bind(this));
        }



        , _saveBelongsTo: function(transaction, noReload, callback) {
            this.emit('beforeSaveBelongsTo');
            async.each(Object.keys(this._belongsTo), function(belongsToId, next){
                this._belongsTo[belongsToId].save(transaction, noReload, next);
            }.bind(this), function(err){
                this.emit('afterSaveBelongsTo');
                callback(err);
            }.bind(this));
        }



        , _saveMappings: function(transaction, noReload, callback) {
            this.emit('beforeSaveMappings');
            async.each(Object.keys(this._mappings), function(mappingId, next){
                this._mappings[mappingId].save(transaction, noReload, next);
            }.bind(this), function(err){
                this.emit('afterSaveMappings');
                callback(err);
            }.bind(this));
        }




        , _saveReferences: function(transaction, noReload, callback) {
            this.emit('beforeSaveRefernces');

            async.each(this._changedReferences, function(key, next){
                var   value  = this._references[key]
                    , column = this._columns[key].column;


                // a query was set as reference
                if (value === null || value === undefined) {
                    this[column.name] = null;
                    next();
                }
                else if (value.isQuery) {
                    value.limit(1);

                    value.findOne(function(err, model) {
                        if (err) next(err);
                        else if (!model) {
                            this[column.name] = null;
                            this[value.tableName] = null;
                            next();
                        }
                        else {
                            this[column.name] = model[column.referencedColumn];
                            this[value.tableName] = model;
                            next();
                        }
                    }.bind(this));
                }
                else {
                    if (value.isSaved()) {
                        this[column.name] = value[column.referencedColumn];
                        next();
                    }
                    else value._save(transaction, noReload, function(err){
                        if (err) next(err);
                        else {
                            this[column.name] = value[column.referencedColumn];
                            next();
                        }
                    }.bind(this));
                }
            }.bind(this), function(err){
                this.emit('afterSaveReferences');
                callback(err);
            }.bind(this));
        }  



         , dir: function(returnResult) {
           var obj = {};

            Object.keys(this._columns).forEach(function(keyName) {
                var column = this._columns[keyName];

                switch (column.type) {
                    case 'mapping':
                        if (this._mappings[keyName]) obj[keyName] = this[keyName].dir(true);
                        break;

                    case 'belongsTo':
                        if (this._belongsTo[keyName]) obj[keyName] = this[keyName].dir(true);
                        break;

                    case 'reference':
                        if (this._references[keyName]) obj[keyName] = (typeof this[keyName] === 'object' && typeof this[keyName].dir === 'function' ? this[keyName].dir(true) : this[keyName]);
                        break;

                    case 'scalar':
                        if (!type.undefined(this[keyName])) obj[keyName] = this[keyName];
                        break;

                    default:
                        throw new Exception('Column type «'+column.type+'» is not supported!');
                }
            }.bind(this));

            if (returnResult) return obj;
            else log(obj);
        }




        , toJSON: function(){
            var obj = {};

            Object.keys(this._columns).forEach(function(keyName) {
                var column = this._columns[keyName];

                switch (column.type) {
                    case 'mapping':
                        if (this._mappings[keyName]) obj[keyName] = this[keyName].toJSON();
                        break;

                    case 'belongsTo':
                        if (this._belongsTo[keyName]) obj[keyName] = this[keyName].toJSON();
                        break;

                    case 'reference':                        
                        if (this._references[keyName]) {
                            obj[keyName] = this[keyName].toJSON();
                        }
                        // hidden ref
                        Object.defineProperty(obj, column.column.name, {value: this._values[column.column.name]});
                        break;

                    case 'scalar':
                        if (!type.undefined(this[keyName])) obj[keyName] = this[keyName];
                        break;

                    default:
                        throw new Exception('Column type «'+column.type+'» is not supported!');
                }
            }.bind(this));

            return obj;
        }
    });
}();
