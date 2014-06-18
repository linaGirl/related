!function(){

    var   Class         = require('ee-class')
        , Arguments     = require('ee-arguments')
        , async         = require('ee-async')
        , EventEmitter  = require('ee-event-emitter')
        , type          = require('ee-types')
        , log           = require('ee-log');





    module.exports = new Class({
        inherits: EventEmitter


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

            // check for changes
            //this.on('change', this._setChanged.bind(this));

            if (options.parameters) this._setValues(options.parameters);
        }



        /*
         * set a new node as parent, the node may be added at the
         * top or at the end of that level. the parent argument may
         * be either an instance of a model or an id
         */
        , setNestedSetParent: function(parentNode, asLastNode) {
            this._checkNestedSetInput(parentNode);
            this._nestedSetConfig.parentNode    = parentNode;
            this._nestedSetConfig.asLastNode    = !!asLastNode;
        }


        /*
         * set a new node as prior node (same level). the parent
         * argument may be either an instance of a model or an id.
         */
        , setNestedSet: function(referenceNode, beforeNewNode) {
            this._checkNestedSetInput(priorNode);
            this._nestedSetConfig.referenceNode     = referenceNode;
            this._nestedSetConfig.beforeNewNode     = !!beforeNewNode;
        }


        /*
         * check for correct input for nested set functions
         */
        , _checkNestedSetInput: function(node) {
            if (!this._defintion.isNestedSet) throw new Error('Cannot updte nested set parameters, the model «'+this.getEntityName()+'» is not a nested set. check your db strucutre and the db configuration.');
            if (!type.integer(node)) {
                if (!type.function(node.isModel)) throw new Errro('Cannot add item typeof «'+type(node.isModel)+'» as parentNode! Expected integer or «'+this.getEntityName()+'» model.');
                if (node.getEntityName() !== this.getEntityName())  throw new Errro('Cannot add «'+node.getEntityName()+'» model as parentNode of a «'+this.getEntityName()+'» model! Expected integer or «'+this.getEntityName()+'» model.');
            } 
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
                    throw new Error('Failed to create proper delete query, no filter was created (see query definition above)');
                }
                else {
                    // soft delete?
                    if (!hardDelete && this._defintion.deletedTimestamp) {
                        query.values = {};
                        query.values[this._defintion.deletedTimestamp] = process.env.ORM_TIMESTAMP_VALUE ? new Date(process.env.ORM_TIMESTAMP_VALUE) : new Date();
                        transaction.executeQuery('update', query, callback);
                    }
                    else transaction.executeQuery('delete', query, callback);
                }
            }
            else callback(new Error('Cannot delete model, it wasn\'t loaded from the database!'));
        }





        , clone: function() {
            var clonedInstance = new (this._getDatabase()[this._defintion.model.name])();

            
        }



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
         * update nested set stuff after the model was saved
         */
        , _updateNestedSet: function(transaction, callback) {
            var   databaseName
                , entityName;

            if (this._defintion.isNestedSet && this._nestedSetConfig && (this._nestedSetConfig.parentNode || this._nestedSetConfig.referenceNode)) {
                databaseName    = this._defintion.getDatabaseName();
                entityName      = this.getEntityName();

                this._getNestedSetTargetNode((this._nestedSetConfig.parentNode || this._nestedSetConfig.referenceNode), transaction, databaseName, entityName, function(err, newNode) {
                    var   left          = this._defintion.nestedSetLeft
                        , right         = this._defintion.nestedSetRight
                        , leftFilter    = {}
                        , leftValues    = {}
                        , rightFilter   = {}
                        , rightValues   = {}
                        , newRight
                        , newLeft
                        , moveToRight
                        , offsetStart
                        , offsetEnd
                        , wait;

                    if (err) callback(err);
                    else {
                        // when all element are moved we shoudl set our new position
                        wait = async.waiter(function(err){
                            if (err) callback(err);
                            else {
                                this[left] = newLeft;
                                this[right] = newRight;
                                callback();
                            }
                        }.bind(this));

                        // movement direction
                        moveToRight = this[left] < newNode[left];

                        if (this._nestedSetConfig.parentNode) {
                            if (this._nestedSetConfig.asLastNode) {
                                offsetStart     = moveToRight ? this[left] : newNode[right]-1;
                                offsetEnd       = moveToRight ? newNode[left] : this[left];
                                newLeft         = 0;
                                newRight        = 0;
                            }
                            else {
                                offsetStart     = moveToRight ? this[right] : newNode[left];
                                offsetEnd       = moveToRight ? newNode[left]+1 : this[left];
                                newLeft         = 0;
                                newRight        = 0;
                            }
                        }
                        else {
                            if (this._nestedSetConfig.beforeNewNode) {
                                offsetStart     = moveToRight ? this[right] : newNode[left]-1;
                                offsetEnd       = moveToRight ? newNode[left] : this[left];
                                newLeft         = 0;
                                newRight        = 0;
                            }
                            else {
                                offsetStart     = moveToRight ? this[right] : newNode[right];
                                offsetEnd       = moveToRight ? newNode[right]+1 : this[left];
                                newLeft         = 0;
                                newRight        = 0;
                            }                            
                        }

                        leftFilter[left]    = ORM.and(ORM.gt(offsetStart), ORM.lt(offsetEnd));
                        leftValues[left]     = moveToRight ? ORM.increase(2) : ORM.decrease(2)

                        rightFilter[right]  = ORM.and(ORM.gt(offsetStart), ORM.lt(offsetEnd));
                        rightValues[right]   = moveToRight ? ORM.increase(2) : ORM.decrease(2)

                        // update left
                        ORM[databaseName][entityName](leftFilter).update(leftValues, wait(), transaction);

                        // update right
                        ORM[databaseName][entityName](rightFilter).update(rightValues, wait(), transaction);
                    }
                }.bind(this));
            }
            else callback();
        }


        , _getNestedSetTargetNode: function(node, transaction, databaseName, entityName, callback) {
            var filter;

            if (type.number(node)) {
                filter = {};

                if (this._defintion.primaryKeys.length > 1) throw new Error('Cannot load nested set node on model «'+this.getEntityName()+'» with more than one primarykey, please report a feature request @github ;)');
                filter[this._defintion.primaryKeys[0]] = node;

                ORM[databaseName][entityName](filter).findOne(function(err, newNode) {
                    if (err) callback(err);
                    else if (!newNode) callback(new Error('Nested set «'+this.getEntityName()+'» failed to load new parent / prior node'));
                    else callback(null, newNode);
                }.bind(this));
            }
            else {
                node.reload(callback, transaction);
            }
        }


        , _save: function(transaction, noReload, outerCallback) {
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
                        if (this._changedValues.length) {
                            this._defintion.primaryKeys.forEach(function(key){
                                query.filter[key] = this[key];
                            }.bind(this));

                            if (this._defintion.updatedTimestamp) query.values[this._defintion.updatedTimestamp] = process.env.ORM_TIMESTAMP_VALUE ? new Date(process.env.ORM_TIMESTAMP_VALUE) : new Date();

                            transaction.executeQuery('update', query, function(err){
                                var wait;

                                if (err) callback(err);
                                else {
                                    wait = async.waiter(callback);
                                    this._updateNestedSet(transaction, wait());
                                    this._saveChildren(transaction, noReload, wait());
                                }
                            }.bind(this));
                        }
                        else this._saveChildren(transaction, noReload, callback);
                    }
                    else {
                        if (this._defintion.updatedTimestamp) query.values[this._defintion.updatedTimestamp] = process.env.ORM_TIMESTAMP_VALUE ? new Date(process.env.ORM_TIMESTAMP_VALUE) : new Date();
                        if (this._defintion.createdTimestamp) query.values[this._defintion.createdTimestamp] = process.env.ORM_TIMESTAMP_VALUE ? new Date(process.env.ORM_TIMESTAMP_VALUE) : new Date();

                        transaction.executeQuery('insert', query, function(err, result){
                            var wait;

                            if (err) callback(err);
                            else {
                                if (result.type === 'id') {                                    
                                    if(result.id) {
                                        if (this._defintion.primaryKeys.length === 1){
                                            this[this._defintion.primaryKeys[0]] = result.id;
                                        }
                                        else throw new Error('Cannot load record with more than one primarykey when at least on of the primary keys has an autoincermented value!');
                                    }

                                    wait = async.waiter(callback);
                                    this._updateNestedSet(transaction, wait());
                                    this._saveChildren(transaction, noReload, wait());
                                }
                                else throw new Error('not implemented!');
                            }
                        }.bind(this));
                    }
                }
            }.bind(this));            
        }



        , _saveChildren: function(transaction, noReload, callback) {
            async.wait(function(done) {
                this._saveMappings(transaction, noReload, done);
            }.bind(this)
            , function(done) {
                this._saveBelongsTo(transaction, noReload, done);
            }.bind(this), callback);
        }



        , _saveBelongsTo: function(transaction, noReload, callback) {
            async.each(Object.keys(this._belongsTo), function(belongsToId, next){
                this._belongsTo[belongsToId].save(transaction, noReload, next);
            }.bind(this), callback);
        }



        , _saveMappings: function(transaction, noReload, callback) {
            async.each(Object.keys(this._mappings), function(mappingId, next){
                this._mappings[mappingId].save(transaction, noReload, next);
            }.bind(this), callback);
        }




        , _saveReferences: function(transaction, noReload, callback) {
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
            }.bind(this), callback);
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
