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
            Class.define(this, '_changedValues'     , Class([]).Writable());
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



        , _setChanged: function() {
            this._hasChanges = true;
        }


        /*
         * inidcates if this model was changed since it was laoded from the database
         */
        , hasChanges: function() {
            return !!this._changedValues.length;
        }


        /*
         * returns a complete filter object which lets
         * you laod exactly this model instance from the db
         */
        , getPrimaryKeyFilter: function() {
            var filter = {};
            this._defintion.primaryKeys.forEach(function(key) {
                filter[key] = this[key];
            }.bind(this));

            return filter;
        }


        /*
         * return the models definition object
         */
        , getDefinition: function() {
            return this._defintion;
        }


        /*
         * return the models primary keys
         */
        , getPrimaryKeys: function() {
            return this._defintion.primaryKeys;
        }


        /*
         * tell the outside that i'm a model
         */
        , isModel: function() {
            return true;
        }


        /*
         * return the models name
         */
        , getEntityName: function() {
            return this._defintion.name;
        }


        /*
         * set and interprets values on this model
         * can work with literals, queries and model instances
         */
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


        /*
         * add queries as values of this model
         */
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



        /*
         * load all fields of this model, if not all were selcted before
         */
        , loadAll: function(callback){
            return this.reload(callback);
        }


        /*
         * indicates if this model was loaded from the database
         */
        , isFromDatabase: function(){
            return this._fromDb;
        }


        /*
         * indicated if this model was loaded from the database
         * and if there aren't any changes on it
         */
        , isSaved: function() {
            this.isFromDatabase() && !this._hasChanges;
        }


        /*
         * reload the current model, so we have the data from the db
         *
         * @param <Object> transaction
         */
        , reload: function(callback, transaction) {
            if (!this.isFromDatabase()) return callback(new Error('Cannot reload model «'+this.getEntityName()+'» without saving it first!'));

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
                    if (!data.length) callback(new Error('Reload for model «'+this.getEntityName()+'» failed, record doesn\'t exist!'));
                    else {
                        this._setValues(data[0]);
                        this._changedValues = [];
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



        /*
         * returns all values that weer changed since the loading it from the db
         */
        , _getChangedValues: function() {
            var data = {};

            this._changedValues.forEach(function(key){
                data[key] = this[key];
            }.bind(this));

            return data;
        }




        /*
         * we need to emit the events manually since they
         * must be called in the correct order and one after
         * the other so we stay consitent and we can wait for 
         * all callback^to be called
         *
         * @param <String> the venet to emit
         */
        , _emitEvent: function(event) {
            var   listeners     = this._extensionEventListeners[event] ? this._extensionEventListeners[event].concat(this.listener(event)) : this.listener(event)
                , args          = Array.prototype.slice.call(arguments, 1)
                , callback      = args[args.length-1]
                , originalCallback
                , index
                , callNext;


            if (listeners && listeners.length) {
                index = 0;

                // this is the callback for all listeners
                // it should break and return when an error  
                // happened or the listener tells it to do so
                callNext = function(err, endNow) {
                    if (err) originalCallback(err);
                    else if (endNow) originalCallback(null, true);
                    else if (index++ < listeners.length) {
                        listeners[index-1].apply(null, args);
                    }
                    else callback();
                }.bind(this);

                // the callback of the calling function, we call it for them if 
                // the lsiterner errored or he decided to stop the action
                originalCallback = args[0];

                // remove the the original callback
                args = args.slice(1, args.length-1);

                // add myself as first parameter
                args.unshift(this);

                // add my own callback
                args.push(callNext);


                // aaan go!
                callNext();
            }
            else callback();
        }

       

        /*
         * emits a specifc event when a transaction is commited successfull
         *
         * @param <Object> transaction
         * @param <string> event, event to emit when the transaction was commited
         */
        , _emitOnCommit: function(transaction, event) {
            transaction.once('commit', function() {
                this.emit.apply(this, [event, this].concat(Array.prototype.slice.call(arguments, 2)));
            }.bind(this));
        }



        , delete: function() {
            var   args          = new Arguments(arguments)
                , callback      = args.getFunction(function(){})
                , transaction   = args.getObject(); 

            if (transaction) {
                this._delete(transaction, callback);
            }
            else {
                transaction = this._getDatabase().createTransaction();

                this._delete(transaction, function(err){
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



         /*
         * private delete method
         *
         * @param <String> the venet to emit
         */
        , _delete: function(transaction, callback) {
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
                    this._emitEvent('beforeDelete', callback, transaction, function() {
                        this._emitOnCommit(transaction, 'afterDeleteCommit');
                        transaction.executeQuery('delete', query, function(err){
                            if (err) callback(err);
                            else this._emitEvent('afterDelet', callback, transaction, callback);
                        }.bind(this));
                    }.bind(this));
                }
            }
            else callback(new Error('Cannot delete model «'+this.getEntityName()+'», it wasn\'t loaded from the database!'));
        }



        /*
         * public save method, saves all referveces, this model, all mappings
         * inverse references (belongs to). will create a transaction when none
         * is passed to it
         *
         * @param <Function> callback -> called after saving finished, optional
         * @param <Boolean> noReload -> when the model should not be reloaded after saving it, options, default false
         * @param <Object> transaction -> the transaction to execute the queries on, optional
         */
        , save: function() {
            var   args          = new Arguments(arguments)
                , callback      = args.getFunction(function(){})
                , noReload      = args.getBoolean(false)
                , transaction   = args.getObject();

            // either we get a transaction from the outside or
            // we have to create our own
            if (transaction) {
                this._save(transaction, noReload, function(err) {
                    callback(err, this);
                }.bind(this));
            }
            else {
                // create a new transaction
                transaction = this._getDatabase().createTransaction();

                // transaction management is required here
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
                                this._changedValues = [];
                                if (noReload) callback(null, this);                                
                                else {
                                    this.reload(function(err){
                                        if (err) callback(err);
                                        else callback(null, this);
                                    }.bind(this));
                                }
                            }
                        }.bind(this));
                    }
                }.bind(this));
            }

            return this;
        }




        /*
         * public save method, saves all referveces, this model, all mappings
         * inverse references (belongs to). will create a transaction when none
         * is passed to it
         *
         * @param <Object> transaction -> the transaction to execute the queries on
         * @param <Boolean> noReload -> when the model should not be reloaded after saving it
         * @param <Function> callback -> called after saving finished
         */
        , _save: function(transaction, noReload, callback) {

            // make sure the model has a primary key
            // we cannot reload models which have no primary
            // key
            if (!this._defintion.primaryKeys.length) throw new Error('Cannot save model «'+this.getEntityName()+'», primary key not found!');

            // we need to change the status if the transaction succeeds
            transaction.once('commit', function(){
                this._fromDb = true;
                this._hasChanges = false;
                //if (!noReload) this.reload();
            }.bind(this));


            // this is a pretty unreliable event, you are not going to 
            // know if the save is going to succeed
            this._emitEvent('beforeSave', callback, transaction, function() {

                // make sure to emit this event when the transaction was successsfull
                this._emitOnCommit(transaction, 'afterSaveCommit');

                // save references before everything else
                this._saveReferences(transaction, noReload, function(err, stopProcess) {
                    var   query
                        , afterSaveCallback;

                    if (err) callback(err);
                    else if (stopProcess) callback();
                    else {

                        // build query, add filters
                        query = {
                              from      : this._defintion.getTableName()
                            , database  : this._defintion.getDatabaseName()
                            , filter    : {}
                        };


                        // tell the db which keys to return
                        if (this._defintion.primaryKeys.length) query.returning = this._defintion.primaryKeys;

                        // callback to be called after update / insert was completed, it manages the events
                        // to call
                        afterSaveCallback = function(err, stopProcess) {
                            if (err) callback(err);
                            else if (stopProcess) callback();
                            else {
                                this._saveDependents(transaction, noReload, function(err) {
                                    if (err) callback(err);
                                    else this._emitEvent('afterSave', callback, transaction, callback);
                                }.bind(this));
                            }
                        }.bind(this);


                        // so, now we going either to update or save a new record
                        if (this.isFromDatabase()) {
                            this._update(transaction, query, afterSaveCallback);
                        }
                        else {
                            this._insert(transaction, query, afterSaveCallback);
                        }
                    }
                }.bind(this));   
            }.bind(this));
        }



        /*
         * insert new record
         *
         * @param <Object> transaction -> execute the wueries on this
         * @param <Object> query -> used to perform the update
         * @param <Function> callback
         */
        , _insert: function(transaction, query, callback) {
            this._emitEvent('beforeInsert', callback, transaction, function() {

                // set the query values
                query.values = this._values;

                // goin to emit events on commit
                this._emitOnCommit(transaction, 'afterInsertCommit', this);

                transaction.executeQuery('insert', query, function(err, result) {
                    if (err) callback(err);
                    else {
                        // this is littlebit weird, but it indicates that
                        // the db returned a valid dataset
                        if (result.type === 'id') {

                            // yeah, we got some result from mysql which can't handle compund keys
                            if (result.id) {
                                // mysql doesn't support compund primaries, check fo that
                                if (this._defintion.primaryKeys.length === 1) {
                                    this[this._defintion.primaryKeys[0]] = result._mysql_id;
                                }
                                else {
                                    // maybe the user did set the primary by himself, this would let us work 
                                    // on the model
                                    if (this._defintion.primaryKeys.some(function(key) {
                                        return type.undefined(this[key]);
                                    }.bind(this))){
                                        return callback(new Error('Cannot load data for the model «'+this.getEntityName()+'» since mysql doesn\'t support compound primary keys. You need to set the primary key values on the model manually or you have to use a single autincrement value as primary instead.'));
                                    }
                                }
                            }
                            else if (!type.undefined(result.values)) {
                                // working with postgres :) wise choice!
                                if (result.values === null) {
                                    // there is something wrong
                                    return callback(new Error('Insert for the model «'+this.getEntityName()+'» did not return the requested data! please file an issue'));
                                }
                                else {
                                    // assign the values
                                    Object.keys(result.values).forEach(function(key) {
                                        this[key] = result.values[key];
                                    }.bind(this));
                                }
                            }
                            else throw new Error('The model «'+this.getEntityName()+'» got unexpected data, maybe ou should update your node modules!');

                            // yeh, we0're done, emit the afterinsert event
                            this._emitEvent('afterInsert', callback, transaction, callback);
                        }
                        else throw new Error('Unexpected return value while fro minsert into model «'+this.getEntityName()+'». please file an issue');
                    }
                }.bind(this));
            }.bind(this));
        }



        /*
         * execute an update on this model
         *
         * @param <Object> transaction -> execute the wueries on this
         * @param <Object> query -> used to perform the update
         * @param <Function> callback
         */
        , _update: function(transaction, query, callback) {
            this._emitEvent('beforeUpdate', callback, transaction, function() {

                // get changed values
                query.values = this._getChangedValues()

                // goin to emit events on commit
                this._emitOnCommit(transaction, 'afterUpdateCommit', this);

                // we're going to do nothing if there aren't any changes
                if (this.hasChanges()) {

                    // add the filter to the query
                    this._defintion.primaryKeys.forEach(function(key) {
                        query.filter[key] = this[key];
                    }.bind(this));
                    
                    // do it
                    transaction.executeQuery('update', query, function(err) {
                        if (err) callback(err);
                        else this._emitEvent('afterUpdate', callback, transaction, callback);
                    }.bind(this));
                }
                else callback();
            }.bind(this));
        }


        /*
         * save all dependent records: mappings and items referencing
         * this model (belongsTo)
         *
         * @param <Object> transaction -> execute the wueries on this
         * @param <Object> noReload -> indicate wheter to reload the models
         * @param <Function> callback
         */
        , _saveDependents: function(transaction, noReload, callback) {
            this._emitEvent('beforeSaveDependents', callback, transaction, function() {
                async.wait(function(done) {
                    this._saveMappings(transaction, noReload, done);
                }.bind(this)
                , function(done) {
                    this._saveBelongsTo(transaction, noReload, done);
                }.bind(this), function(err) {
                    if (err) callback(err);
                    else this._emitEvent('afterSaveDependents', callback, transaction, callback);
                }.bind(this));
            }.bind(this));
        }


        /*
         * save all items referencing this model (belongsTo)
         *
         * @param <Object> transaction -> execute the wueries on this
         * @param <Object> noReload -> indicate wheter to reload the models
         * @param <Function> callback
         */
        , _saveBelongsTo: function(transaction, noReload, callback) {
            this._emitEvent('beforeSaveBelongsTo', callback, transaction, function() {
                async.each(Object.keys(this._belongsTo), function(belongsToId, next){
                    this._belongsTo[belongsToId].save(transaction, noReload, next);
                }.bind(this), function(err) {
                    if (err) callback(err);
                    else this._emitEvent('afterSaveBelongsTo', callback, transaction, callback);
                }.bind(this));
            }.bind(this));
        }


        /*
         * save all mappings
         *
         * @param <Object> transaction -> execute the wueries on this
         * @param <Object> noReload -> indicate wheter to reload the models
         * @param <Function> callback
         */
        , _saveMappings: function(transaction, noReload, callback) {
             this._emitEvent('beforeSaveMappings', callback, transaction, function() {
                async.each(Object.keys(this._mappings), function(mappingId, next){
                    this._mappings[mappingId].save(transaction, noReload, next);
                }.bind(this), function(err) {
                    if (err) callback(err);
                    else this._emitEvent('afterSaveMappings', callback, transaction, callback);
                }.bind(this));
            }.bind(this));
        }



         /*
         * save all references
         *
         * @param <Object> transaction -> execute the wueries on this
         * @param <Object> noReload -> indicate wheter to reload the models
         * @param <Function> callback
         */
        , _saveReferences: function(transaction, noReload, callback) {
            this._emitEvent('beforeSaveRefernces', callback, transaction, function() {
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
                    if (err) callback(err);
                    else this._emitEvent('afterSaveReferences', callback, transaction, callback);
                }.bind(this));
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
