(function() {
    'use strict';


    const Class         = require('ee-class')
    const EventEmitter  = require('ee-event-emitter')
    const type          = require('ee-types')
    const log           = require('ee-log')
    const crypto        = require('crypto')
    const QueryContext  = require('related-query-context')
    const Query         = require('./Query')
    const ModelCloner   = require('./ModelCloner')
    const clone         = require('./clone')
    const RelatedSet    = require('./Set')
    const Lock          = require('./Lock');
    

    let ORM;




    const debugHanging = process.argv.includes('--related-hanging');
    const debugDev = process.argv.includes('--related-dev-debug');
    let hangingTimeout = 60000;

    process.argv.forEach((arg) => {
        const match = /--related-hanging-timeout=([0-9]+)/.exec(arg);
        if (match) hangingTimeout = parseInt(match[1], 10);
    });






    module.exports = new Class({
        inherits: EventEmitter


        , init: function(options) {
            //Class.define(this, '_defintion'         , Class(options.definition));
            Class.define(this, '_orm'               , Class(options.orm));

            Class.define(this, '_values'            , Class({}));
            Class.define(this, '_changedValues'     , Class([]).Writable());
            Class.define(this, '_mappings'          , Class({}).Writable());
            Class.define(this, '_belongsTo'         , Class({}));
            Class.define(this, '_references'        , Class({}));
            Class.define(this, '_changedReferences' , Class([]));
            Class.define(this, '_mappingIds'        , Class([]));
            Class.define(this, '_hasChanges'        , Class(false).Writable());
            Class.define(this, '_debugMode'         , Class(false).Writable());
            Class.define(this, '_relatingSets'      , Class(options.relatingSets));
            Class.define(this, '_getDatabase'       , Class(options.getDatabase));
            Class.define(this, '_fromDb'            , Class(options.isFromDB || false).Writable());
            Class.define(this, '_deleted'           , Class(false).Writable());
            Class.define(this, '_set'               , Class(options.set)); // the set this record is contained

            Class.define(this, '_busy'              , Class(false).Writable());
            Class.define(this, '_pool'              , Class(options.pool || null).Writable().Configurable());
            Class.define(this, '_queue'             , Class([]));
            Class.define(this, '_saveLock'          , Class(null).Writable().Configurable());

            // require the orm if not already set, cannot load at
            // the begin of the file because the orm includes this file
            if (!ORM) ORM = require('./ORM');

            // we need to clone the json column store
            Class.define(this, '_jsonColumns', Class(Object.create(this._jsonColumns)));


            // check for changes
            //this.on('change', this._setChanged.bind(this));

            if (options.parameters) this._setValues(options.parameters, !this._fromDb);
        }



        /**
         * clone the currrent model and all mappings
         *
         * @param <function> optional callback. when omitted a promise is returned
         * @param <boolean> optional. if true the models this model belongs to should point
         *                  to the cloned instance
         * @param <object>
         *
         * @returns <Promise> if the callback is omitted
         */
        , clone: function() {
            // we can clone this model, all the mappings between
            // this and other models. we first need to load all mappings
            // else cloning will fail. if this

            return new ModelCloner(this);
        }



        /**
         * set multiple properties on the model
         *
         * @param <Obejct> content
         *
         * @returns <Object> model instance
         */
        , setContent: function(content) {
            if (content && type.object(content)) this._setValues(content, true);
            return this;
        }


        /**
         * set dirty
         */
        , _setChanged: function() {
            this._hasChanges = true;
        }


        /*
         * indicates if this record was deleted
         */
        , isDeleted: function() {
            return !!this._deleted;
        }


        /*
         * inidcates if this model was changed since it was laoded from the database
         */
        , hasChanges: function() {
            return !!this._changedValues.length || this._hasChanges;
        }


        /*
         * inidcates if this model was changed since it was laoded from the database
         */
        , isDirty: function() {
            return !!this._changedValues.length || this._hasChanges;
        }


        /**
         * enable the bug mode
         *
         * @param <Boolean> optional mode
         */
        , setDebugMode: function(status) {
            this._debugMode = type.undefined(status) ? true : !!status;
            return this;
        }


        /**
         * enable the bug mode
         *
         * @param <Boolean> optional mode
         */
        , debug: function(status) {
            this._debugMode = type.undefined(status) ? true : !!status;
            return this;
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
         * returns the database name
         */
        , getDatabaseName: function() {
            this._defintion.getDatabaseName();
        }



        /**
         * sets the pool for all transactions executed on this model
         */
        , setPool: function(pool) {
            this._pool = pool;
        }



        /*
         * set values
         */
        , setValues: function(values) {
            this._setValues(values, true);
            return this;
        }


        /*
         * set and interprets values on this model
         * can work with scalar values, queries and model instances
         */
        , _setValues: function(values, isExternalInput) {
            if (!type.undefined(values) && !type.object(values)) throw new Error('Expected an object contining values for a new model instance, got a «'+type(values)+'»!');

            Object.keys(values).forEach(function(property) {
                var   item   = values[property]
                    , isJSON = this._jsonColumns[property] || this._jsonColumns[property] === null;

                if (!isJSON && type.object(item) && this._addQueryObject(property, item)) return;
                else if (!isJSON && type.array(item)) {
                    item.forEach(function(obj){
                        if (type.object(obj) && this._addQueryObject(property, obj)) return;
                        else throw new Error('Expected a Query or a Model for the key «'+property+'»!');
                    }.bind(this));
                }
                else if (property === '____id____') this._mappingIds.push(item);
                else {
                    // check if we got a vritaul value which is not a normal part of the model
                    // write it directly to the model object
                    if (this._serialize && this._serialize.indexOf(property) !== -1) {
                        // store as serializable value
                        this[property] = item;
                    }
                    else if (!this._defintion.columns[property]) {
                        if (!this._serialize) this._serialize = [];
                        if (this._serialize.indexOf(property) === -1) this._serialize.push(property);
                        this[property] = item;
                    }
                    else {
                        if (isExternalInput) {
                            // need to move it through the setter
                            this[property] = this._prepareTypedInput(property, item);
                        }
                        else {
                            // check if this json type input, if yes, hash it
                            // and store it for later comparison
                            if ((type.object(item) || type.array(item)) && this._jsonColumns[property] === null) {
                                this._jsonColumns[property] = crypto.createHash('md5').update(JSON.stringify(item)).digest('hex')
                            }

                            // convert to date type before sending to the db
                            this._values[property] = this._prepareTypedInput(property, item);
                        }
                    }
                }
            }.bind(this));
        }



        /**
         * prepares the values based on the target type in the db
         * parses numbers in strings, sets null when required
         *
         * @param <Object> columnName
         * @param <Mixed> value
         */
        , _prepareTypedInput: function(columnName, value) {
            var column = type.object(columnName) ? columnName : this._columns[columnName];

            //if (!column) console.log(columnName, value);

            // don0t do anything if there isn't enough information on the column
            if (!column || !column.column) return value;

            //console.log(column.column, value);

            // check for valid types, like dates
            if (value !== undefined && column.column.jsTypeMapping === 'date' && !type.date(value)) {
                if (type.string(value)) {
                    if (value.length) return new Date(value);
                    else return null;
                }
                else if (type.number(value)) return new Date(value);
                else return value;
            }

            // boolean?
            else if (column.column.jsTypeMapping === 'boolean' && !type.boolean(value)) {
                if (type.undefined(value) || type.null(value) || (type.string(value) && value === '')) return null;
                else if (type.string(value) && value.toLowerCase().trim() === 'false') return false;
                else if (type.string(value) && value.toLowerCase().trim() === 'true') return true;
                else return !!value;
            }

            // handle tinyint as boolean
            // TODO: make a flag for this later (and don't do it on postgres by default)
            else if (column.column.nativeType === 'tinyint') {
                if (type.boolean(value)) return value;
                else if (type.string(value)) return value == '1' || value == 'true';
                else if (type.number(value)) return value == 1;
                else return null;
            }

            // number
            else if (column.column.jsTypeMapping === 'number' && !type.number(value)) {
                if (type.string(value) && !isNaN(parseFloat(value))) return parseFloat(value);
                else if (type.boolean(value)) return value ? 1 : 0;
                else return null;
            }


            // json
            else if (column.column.jsTypeMapping === 'json' && type.string(value)) {
                try {
                    value = JSON.parse(value);
                } catch (e) {};
            }


            return value;
        }


        /*
         * add queries as values of this model
         */
        , _addQueryObject: function(propertyName, item) {
            var name = propertyName;

            if (type.object(item) && item instanceof RelatedSet) {
                // got a set of items
                item.forEach(function(arrayItem) {
                    this._addQueryObject(propertyName, arrayItem);
                }.bind(this));

                return true;
            }
            else if (type.object(item) && ((item.isModel && item.isModel()) || item.isQuery)) {
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
         * tell the entity that isnt from the database
         */
        , isNotFromDatabase: function(){
            this._fromDb = false;
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
        , reload: function(...args) {
            let callback, transaction;

            args.forEach((arg) => {
                if (type.function(arg))     callback    = arg;
                else if (type.object(arg))  transaction = arg;
            });


            const promise = Promise.resolve().then(() => {
                if (!this.isFromDatabase()) return Promise.reject(new Error('Cannot reload model «'+this.getEntityName()+'» without saving it first!'));
                else {
                    const query = {
                          select    : ['*']
                        , from      : this._defintion.getTableName()
                        , database  : this._defintion.getDatabaseName()
                        , filter    : {}
                        , mode      : 'select'
                    };


                    this._defintion.primaryKeys.forEach((key) => {
                        query.filter[key] = this[key];
                    });


                    const context = new QueryContext({
                          pool: this._pool || 'read'
                        , query: query
                        , debug: this._debugMode
                    });


                    return (transaction && !transaction.hasEnded() ? transaction : this._getDatabase()).executeQuery(context).then((data) => {
                        if (!data.length) {
                            log(this, context, data);
                            callback(new Error('Reload for model «'+this.getEntityName()+'» failed, record doesn\'t exist!'));
                        } else {
                            this._setValues(data[0]);
                            this._changedValues = [];
                            this._fromDb = true;

                            return this._reloadRelated({transaction});
                        }
                    });
                }
            });



            // if the user passed a callback, use it. 
            // otherwise return the promise
            if (typeof callback !== 'function') return promise.then(() => Promise.resolve(this));
            else promise.then(() => callback(null, this)).catch(callback);
        }





        , _reloadRelated: function({transaction}) {
            return Promise.all(Object.keys(this._mappings).map((keyName) => {
                return this._mappings[keyName].reload(transaction);
            }));

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

            this.getChangedKeys().forEach(function(key){
                data[key] = this[key];
            }.bind(this));

            return data;
        }



        /**
        * returns unique changed keys as array
        */
        , getChangedKeys: function() {
            return [...new Set(this._changedValues)];
        }



        /**
         * remove a key from the changed values so it will
         * not end up in queries
         */
        , removeChangedValueKey: function(keyName) {
            let index;
            while(index = this._changedValues.indexOf(keyName) >= 0) {
                this._changedValues.splice(index, 1);
            }
        }



        /**
         * remove a value so it wont be stored in the db
         */
        , removeValue: function(keyName) {
            this.removeChangedValueKey(keyName);
            if (this._values[keyName]) delete this._values[keyName];
        }



        /**
        * async event handling. events basically middlewares
        * that also can halt the process  
        *
        */
        , _emitEvent: function(event, ...args) {

            // get the listeners placed by extensions on all model
            // instances and combine them with user placed listeners
            const listeners = this._extensionEventListeners[event] ? this._extensionEventListeners[event].concat(this.listener(event)) : this.listener(event);
            

            if (listeners && listeners.length) {

                // add this model instance as first parameter
                args.unshift(this);

                // execute the async listeners one after another
                return listeners.reduce((promise, currentListener) => {
                    return promise.then((stopExecution) => {

                        // any of the listeners may signal that
                        // the execution should be halted. pass this
                        // to the caller of this class method
                        if (stopExecution) return Promise.resolve(true);
                        else {

                            // we need to wrap the listener because
                            // it may work using callbacks or promises
                            return new Promise((resolve, reject) => {
                                let ignoreCallback = false;


                                // listeners may call the callback or return a promise
                                const mayBePromise = currentListener(...args, (err, stopExecution) => {
                                    if (!ignoreCallback) {
                                        if (err) reject(err);
                                        else resolve(stopExecution);
                                    }
                                });


                                if (type.promise(mayBePromise)) {

                                    // make sure the callback is ignored if the promise is used
                                    ignoreCallback = true;

                                    // pass to upper promise
                                    mayBePromise.then(resolve).catch(reject);
                                }
                            });
                        }
                    });
                }, Promise.resolve());
            } else return Promise.resolve();
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







        , delete: function(...args) {
            let callback, transaction;


            args.forEach((arg) => {
                if (type.function(arg))     callback    = arg;
                else if (type.object(arg))  transaction = arg;
            });



            // invoke the saving process
            const promise = this._prepareDelete({transaction, args});



            // there were queries that did not return
            // this is an attempt to capture those bastards
            if (debugHanging) {
                const t = setTimeout(() => {
                    log.error('timeout encountered', 'delete', this.getEntityName(), this);
                }, 60000);

                promise.then(() => {
                    clearTimeout(t);
                    return Promise.resolve();
                }).catch((err) => {
                    clearTimeout(t);
                    return Promise.reject(err);
                });
            }



            // if the user passed a callback, use it. 
            // otherwise return the promise
            if (typeof callback !== 'function') return promise.then(() => Promise.resolve(this));
            else promise.then(() => callback(null, this)).catch(callback);
        }







        , _prepareDelete: function({transaction, args}) {

            // there may be problems with locks 
            // and other unexpected behaviors when
            // executing operations in parallel on the
            // same record. this makes sure that all 
            // operations on this model instance are 
            // executed one after another 
            return this._enqueue().then((executeNext) => {


                // check if we got a transaction from the outside
                // or if the database object we're working on is
                // a transaction.
                if (transaction || this._getDatabase().isTransaction()) {
                    if (!transaction) transaction = this._getDatabase().getTransaction();


                    // make sure the next callback is invoked!
                    return this._delete({transaction}).then(() => {
                        executeNext();
                        return Promise.resolve();
                    }).catch((err) => {
                        executeNext();
                        return Promise.reject(err);
                    });
                } else {


                    // we're creating a new transaction for all 
                    // operations on this model and all dependencies
                    // that we're going to operate on. ( we pass this 
                    // transaction to all other models we're going to save)
                    transaction = this._getDatabase().createTransaction(this._pool || 'write');


                    // make sure the next callback is invoked!
                    return this._delete({transaction}).then(() => {

                        // auto commit the transaction since we're 
                        // the guys that created it!
                        return transaction.commit().then(() => {
                            
                            // set status flags
                            this._deleted = true;
                            this._fromDb = false;
                            this.emit('delete', this);

                            // execute other jobs in the queue
                            executeNext();

                            return Promise.resolve();
                        });
                    }).catch((err) => {

                        // ends the transaction and frees the connection
                        return transaction.rollback().then(() => {

                            // nice, that worked. failing anyway...
                            return Promise.reject();
                        }).catch(() => {

                            // execute other jobs in the queue
                            executeNext();

                            // fail using the original error
                            return Promise.reject(err);
                        });
                    });
                }
            });
        }





         /*
         * private delete method
         *
         * @param <String> the venet to emit
         */
        , _delete: function({transaction}) {
            try {
                const query = {
                      from      : this._defintion.getTableName()
                    , database  : this._defintion.getDatabaseName()
                    , filter    : {}
                    , mode      : 'delete'
                };

                // cannot delete a model not loaded from the database
                if (this._fromDb){
                    if (!query.select) query.select = [];

                    query.limit = 1;

                    this._defintion.primaryKeys.forEach((key) => {
                        query.filter[key] = this[key];
                        query.select.push(key);
                    });



                    if (!Object.keys(query.filter).length) {
                        const err = new Error(`Failed to create proper delete query for model '${this.getEntityName()}', no filter was created!`);
                        log(err, this, query);
                        return Promise.reject(err);
                    } else {
                        this._emitOnCommit(transaction, 'afterDeleteCommit');

                        // lifecycle event for extensions and model implementers
                        return this._emitEvent('beforeDelete', transaction).then((skipDelete) => {
                            if (skipDelete) return this._emitEvent('afterDelete', transaction);
                            else {
                                const context = new QueryContext({
                                      query: query
                                    , debug: this._debugMode
                                    , pool: this._pool || 'write'
                                });


                                return transaction.executeQuery(context).then(() => {

                                    // lifecycle event for extensions and model implementers
                                    return this._emitEvent('afterDelete', transaction);
                                });
                            }
                        });
                    }
                } else return Promise.reject(new Error(`Cannot delete model '${this.getEntityName()}', it wasn't loaded from the database!`));
            } catch (err) {
                return Promise.reject(err);
            }
        }




        /**
         * upde or insert data. update is executed if all primaries are set,
         * else an insert is triggered, argumetns a re the same as for save
         */
        , updateOrInsert: function() {
            var   args = new Array(arguments.length)
                , i, l

            for (i = 0, l = arguments.length; i < l; i++) args.push(arguments[i]);


            // if the primaries are set we should try an update,
            // if that fails we're going to do an insert
            if (this.getPrimaryKeys().every(function(key) {
                return !type.undefined(this[key]) && !type.null(this[key]);
            }.bind(this))) {
                // update
                this._fromDb = true;
            }

            // invoke save
            return this.save.appy(this, args);
        }




         /**
         * upde or insert data. update is executed if all primaries are set,
         * else an insert is triggered, argumetns a re the same as for save
         * same as updateOrInsert
         */
        , insertOrUpdate: function() {
            var   args = new Array(arguments.length)
                , i, l

            for (i = 0, l = arguments.length; i < l; i++) args.push(arguments[i]);


            // if the primaries are set we should try an update,
            // if that fails we're going to do an insert
            if (this.getPrimaryKeys().every(function(key) {
                return !type.undefined(this[key]) && !type.null(this[key]);
            }.bind(this))) {
                // update
                this._fromDb = true;
            }

            // invoke save
            return this.save.appy(this, args);
        }









        /**
         * checks if a json column has changed, if yes markes the column as dirty
         */
        , _checkJsonColumns: function() {
            this._jsonColumnsArray.forEach(function(columnName) {
                if (type.object(this._values[columnName]) || type.array(this._values[columnName])) {
                    if (type.string(this._jsonColumns[columnName])) {
                        // ok, we had a previous value, compute the hash and compare
                        if (crypto.createHash('md5').update(JSON.stringify(this._values[columnName])).digest('hex') !== this._jsonColumns[columnName]) {
                            this._changedValues.push(columnName);
                            this._setChanged();
                        }
                    }
                    else {
                        // we had no previous value, but we have on now, this has changed
                        this._changedValues.push(columnName);
                        this._setChanged();
                    }
                }
                else if (type.string(this._jsonColumns[columnName])) {
                    // we got a previous value, but no current value
                    this._changedValues.push(columnName);
                    this._setChanged();
                }

                // make strings. the pg driver sucks, it cannot handle json objects
                if (this._values[columnName] !== null && this._values[columnName] !== undefined) this._values[columnName] = JSON.stringify(this._values[columnName]);
            }.bind(this));
        }









        /**
        * public save method, saves all references, this model, all mappings
        * inverse references (belongs to). will create a transaction when none
        * is passed to it
        *
        * @param <Function> callback -> called after saving finished, optional
        * @param <Boolean> dontReload -> when the model should not be reloaded after saving it, options, default false
        * @param <Object> transaction -> the transaction to execute the queries on, optional
        */
        , save: function(...args) {
            let dontReload = false;
            let callback, transaction, stack, lock;


            args.forEach((arg) => {
                if (arg instanceof Lock)        lock        = arg;
                else if (type.function(arg))    callback    = arg;
                else if (type.boolean(arg))     dontReload  = arg;
                else if (type.object(arg))      transaction = arg;
                else if (type.array(arg))       stack       = arg;
            });
            

            // it's important not to save any model initiated by a users save call 
            // more than once. else we'll may be stuck inside an endless loop when 
            // handling circular data structures :/
            // if we're getting a lock from the outside we us it as reference, 
            // else we're going to create our own lock that we can pass to all other
            // save calls.

            // resolve, because saving this model is already handled elsewhere!
            if (this._saveLock) {
                if (!type.function(callback)) return Promise.resolve(this);
                else callback(null, this);
            } else {
                let localLock;

                // create a lock if we didn't get one
                if (!lock) localLock = lock = new Lock();


                // lock now!
                this._saveLock = lock;

                // make sure to free the lock when the save call is returned
                lock.once('end', () => {
                    this._saveLock = null;
                });



                if ((debugDev || debugHanging) && !stack) stack = [];


                // invoke the saving process
                const promise = this._prepareSave({dontReload, transaction, args, stack, lock});



                // there were queries that did not return
                // this is an attempt to capture those bastards
                if (debugHanging) {
                    const t = setTimeout(() => {
                        log.error('timeout encountered', 'insert/update', this.getEntityName(), this, stack);
                    }, hangingTimeout);

                    promise.then(() => {
                        clearTimeout(t);
                        return Promise.resolve(this);
                    }).catch((err) => {
                        clearTimeout(t);
                        return Promise.reject(err);
                    });
                }




                // if the user passed a callback, use it. 
                // otherwise return the promise
                if (typeof callback === 'function') {
                    promise.then(() => {
                        if (localLock) localLock.free();
                        callback(null, this);
                    }).catch((err) => {
                        if (localLock) localLock.free();
                        callback(err);
                    });
                } else {
                    return promise.then(() => {
                        if (localLock) localLock.free();
                        return Promise.resolve(this);
                    }).catch((err) => {
                        if (localLock) localLock.free();
                        return Promise.reject(err);
                    });
                }
            }
        }





        /**
        * can be used to queue async operations
        * so that they are executed one after another.
        * this is mainly used because we never should 
        * manipulate the same row in parallel!
        */
        , _enqueue: function(args) {
            const createCallback = () => {

                // make sure each callback is invoked exactly one time
                let invoked = false;

                return () => {

                    // wait a tick, so that all other stuff
                    // can settle before we continue
                    process.nextTick(() => {
                        if (!invoked && this._queue.length) {
                            invoked = true;

                            // execute the next item in the queue, 
                            // pass another instance of the callback
                            // which has its own status
                            this._queue.shift()(createCallback());
                        }
                    });
                };
            };
            

            if (!this._queue.length) return Promise.resolve(createCallback());
            else {
                return new Promise((resolve) => {
                    this._queue.push(resolve);
                });
            }
        }









        /**
        * prepare the save operation, creates a transaction if there
        * isn't already one around and makes sure that all operations
        * on this model are executed one after another.
        */
        , _prepareSave: function({dontReload, transaction, args, stack, lock}) {

            if (stack) stack.push({entity: this.getEntityName(), frame: '_prepareSave: before queue'});

            // there may be problems with locks 
            // and other unexpected behaviors when
            // executing operations in parallel on the
            // same record. this makes sure that all 
            // operations on this model instance are 
            // executed one after another 
            return this._enqueue().then((executeNext) => {
                if (stack) stack.push({entity: this.getEntityName(), frame: '_prepareSave: after queue'});

                // check if we got a transaction from the outside
                // or if the database object we're working on is
                // a transaction.
                if (transaction || this._getDatabase().isTransaction()) {
                    if (!transaction) transaction = this._getDatabase().getTransaction();
                    if (stack) stack.push({entity: this.getEntityName(), frame: '_prepareSave: using existing transaction'});
                    if (stack) stack.push({entity: this.getEntityName(), frame: '_prepareSave: before _save'});

                    // make sure the next callback is invoked!
                    return this._save({transaction, dontReload, stack, lock}).then(() => {
                        if (stack) stack.push({entity: this.getEntityName(), frame: '_prepareSave: after _save -> then'});
                        executeNext();
                        return Promise.resolve();
                    }).catch((err) => {
                        if (stack) stack.push({entity: this.getEntityName(), frame: '_prepareSave: after _save -> catch'});
                        executeNext();
                        return Promise.reject(err);
                    });
                } else {
                    if (stack) stack.push({entity: this.getEntityName(), frame: '_prepareSave: creating new transaction'});

                    // we're creating a new transaction for all 
                    // operations on this model and all dependencies
                    // that we're going to operate on. ( we pass this 
                    // transaction to all other models we're going to save)
                    transaction = this._getDatabase().createTransaction(this._pool || 'write');
                    if (stack) stack.push({entity: this.getEntityName(), frame: '_prepareSave: before _save'});


                    // lock on the transaction, make sure we're 
                    // not saving twice on it in order to prevent endless
                    // loops when processing circular data structures
                    this._transactionLock = transaction;

                    // free on transaction end
                    transaction.on('end', () => {
                        this._transactionLock = null;
                    });


                    // make sure the next callback is invoked!
                    return this._save({transaction, dontReload, stack, lock}).then(() => {
                        if (stack) stack.push({entity: this.getEntityName(), frame: '_prepareSave: after _save -> then'});

                        // auto commit the transaction since we're 
                        // the guys that created it!
                        return transaction.commit().then(() => {
                            if (stack) stack.push({entity: this.getEntityName(), frame: '_prepareSave: after transaction.commit -> then'});


                            // there should not be any changed data anymore
                            this._changedValues = [];


                            if (!dontReload) {
                                if (stack) stack.push({entity: this.getEntityName(), frame: '_prepareSave: before reload'});

                                // reload our data from the db to 
                                // get the current clean state
                                return new Promise((resolve, reject) => {
                                    this.reload((err) => {
                                        if (stack) stack.push({entity: this.getEntityName(), frame: '_prepareSave: after reload'});
                                        if (err) reject(err);
                                        else resolve();
                                    });
                                });
                            } else return Promise.resolve();
                        }).then(() => {
                            if (stack) stack.push({entity: this.getEntityName(), frame: '_prepareSave: after reload'});

                            // execute other jobs in the queue
                            executeNext();

                            // we're done
                            return Promise.resolve();
                        });
                    }).catch((err) => {
                        if (stack) stack.push({entity: this.getEntityName(), frame: '_prepareSave: after _save -> catch'});

                        // ends the transaction and frees the connection
                        return transaction.rollback().then(() => {

                            // nice, that worked. failing anyway...
                            return Promise.reject();
                        }).catch(() => {

                            // execute other jobs in the queue
                            executeNext();

                            // fail using the original error
                            return Promise.reject(err);
                        });
                    });
                }
            });
        }






        /*
         * effective save method, saves all references, this model, all mappings
         * inverse references (belongs to)
         *
         * @param <Object> transaction -> the transaction to execute the queries on
         * @param <Boolean> dontReload -> when the model should not be reloaded after saving it
         * @param <Function> callback -> called after saving finished
         */
        , _save: function({transaction, dontReload, stack, lock}) {

            // properly catch errors
            try {

                // make sure the model has a primary key
                // we cannot reload models which have no primary
                // key
                if (!this._defintion.primaryKeys.length) return Promise.reject(new Error(`Cannot save the model '${this.getEntityName()}', no primary key found!`));


                // we need to save the state, it has to be re-set after
                // a rollback
                let hasChanges = this._hasChanges
                    , isFromDB = this.isFromDatabase();


                // we need to change the status if the transaction succeeds
                transaction.once('commit', () => {
                    this._fromDb = true;
                    this._hasChanges = false;
                });


                // need to reset the source status
                transaction.once('rollback', () => {
                    // reset to original status
                    this._fromDb = isFromDB;
                    this._hasChanges = hasChanges;
                });


                // its time to check for changes on json type column
                this._checkJsonColumns();


                // make sure to emit this event when the transaction was successful
                this._emitOnCommit(transaction, 'afterSaveCommit');


                if (stack) stack.push({entity: this.getEntityName(), frame: '_save: before _emitEvent: beforeSave'});

                // lifecycle event for extensions and model implementers
                return this._emitEvent('beforeSave', transaction).then((skipSave) => {
                    if (stack) stack.push({entity: this.getEntityName(), frame: '_save: after _emitEvent: beforeSave', skipSave: !!skipSave});

                    if (skipSave) return this._emitEvent('afterSave', transaction);
                    else {
                        if (stack) stack.push({entity: this.getEntityName(), frame: '_save: before _saveReferences'});

                        // first save all references, we need their ids
                        // on our record
                        return this._saveReferences({transaction, dontReload, stack, lock}).then((stopProcess) => {
                            if (stack) stack.push({entity: this.getEntityName(), frame: '_save: after _saveReferences', stopProcess: !!stopProcess});

                            if (stopProcess) return Promise.resolve();
                            else {

                                // decide if we're updating or inserting
                                return (this.isFromDatabase() ? this._update.bind(this) : this._insert.bind(this))({transaction}).then((stopProcess) => {
                                    if (stack) stack.push({entity: this.getEntityName(), frame: '_save: after _update/_insert', stopProcess: !!stopProcess});

                                    if (stopProcess) return Promise.resolve();
                                    else {

                                        // save records depending on this one
                                        return this._saveDependents({transaction, dontReload, stack, lock}).then(() => {
                                            if (stack) stack.push({entity: this.getEntityName(), frame: '_save: after _saveDependents'});

                                            // lifecycle event for extensions and model implementers
                                            return this._emitEvent('afterSave', transaction);
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            } catch (err) {
                if (stack) stack.push({entity: this.getEntityName(), frame: '_save: catch', err: err});
                return Promise.reject(err);
            };
        }







        /**
        * insert a new record
        */
        , _insert: function({transaction}) {
            try {
                const query = {
                      from      : this._defintion.getTableName()
                    , database  : this._defintion.getDatabaseName()
                    , filter    : {}
                    , mode      : 'insert'
                };


                // tell the db which keys to return
                if (this._defintion.primaryKeys.length) query.returning = this._defintion.primaryKeys;


                // going to emit events on commit
                this._emitOnCommit(transaction, 'afterInsertCommit', this);


                // lifecycle event for extensions and model implementers
                return this._emitEvent('beforeInsert', transaction).then((skipInsert) => {
                    if (skipInsert) return this._emitEvent('afterInsert', transaction);
                    else {

                        // set the query values
                        query.values = this._values;

                        // get a query context that can be sent to 
                        // the driver implementation
                        let context = new QueryContext({
                              query: query
                            , debug: this._debugMode
                            , pool: this._pool || 'write'
                        });


                        // send the context to the related driver which 
                        // prepares it for the actual third party driver
                        return transaction.executeQuery(context).then((result) => { //log(context, result)

                            // the db returned a valid dataset
                            if (result !== undefined) {

                                // mark as from db, this will be reset on rollback
                                this._fromDb = true;


                                // custom data handling for mysql :/
                                if (!type.object(result)) {

                                    // mysql doesn't support compound primaries, check fro that
                                    if (result !== null && this._defintion.primaryKeys.length === 1) {
                                        this[this._defintion.primaryKeys[0]] = result;
                                    } else {
                                        // maybe the user did set the primary by himself, this would let us work
                                        // on the model
                                        if (this._defintion.primaryKeys.some((key) => {
                                            return type.undefined(this[key]);
                                        })) {
                                            return Promise.reject(new Error(`Cannot load data for the model '${this.getEntityName()}' since mysql doesn't support compound primary keys. You need to set the primary key values on the model manually or you have to use a single autoincermenting value as primary instead.`));
                                        }
                                    }
                                } else if (type.object(result)) {

                                    // assign the values
                                    Object.keys(result).forEach(function(key) {
                                        this[key] = result[key];
                                    }.bind(this));
                                } else {
                                    const err = new Error(`Insert for the model '${this.getEntityName()}' did not return the requested data! Please file an issue at https://github.com/eventEmitter/related`);
                                    log(err, this, context);
                                    return Promise.reject(err);
                                }

                                // lifecycle event for extensions and model implementers
                                return this._emitEvent('afterInsert', transaction);
                            } else {
                                const err = new Error(`Unexpected return value while executing an insert query for the model '${this.getEntityName()}'. Please file an issue at https://github.com/eventEmitter/related`);
                                log(err, this, context);
                                return Promise.reject(err);
                            }
                        });
                    }
                });
            } catch (err) {
                return Promise.reject(err);
            }
        }






        /**
        * execute an update on this model
        */
        , _update: function({transaction}) {
            try {

                // create the primary key filtler
                const filter = {};

                this._defintion.primaryKeys.forEach((key) => {
                    filter[key] = this[key];
                });



                // we're going to use the querybuilder to create the update query,
                // this is mostly used by the extensions so they can set advanced
                // filters for the update
                let query = transaction[this.getEntityName()](this._defintion.primaryKeys, filter).limit(1);

                // set the pool if required
                if (this._pool) query.pool(this._pool);


                // going to emit events on commit
                this._emitOnCommit(transaction, 'afterUpdateCommit', this);


                // lifecycle event for extensions and model implementers
                return this._emitEvent('beforeUpdate', transaction, query).then((skipUpdate) => {
                    if (skipUpdate) return this._emitEvent('afterUpdate', transaction);
                    else {

                        // check for changes, skip db update if there aren't any
                        if (!this.hasChanges()) return this._emitEvent('afterUpdate', transaction);
                        else {

                            return new Promise((resolve, reject) => {
                                query.update(this._getChangedValues(), transaction, (err) => {
                                    if (err) reject(err);
                                    else return this._emitEvent('afterUpdate', transaction).then(resolve).catch(reject);
                                });
                            });
                        }
                    }
                });
            } catch (err) {
                return Promise.reject(err);
            }
        }









        /*
         * save all dependent records: mappings and items referencing
         * this model (belongsTo)
         *
         * @param <Object> transaction -> execute the wueries on this
         * @param <Object> dontReload -> indicate wheter to reload the models
         */
        , _saveDependents: function({transaction, dontReload, stack, lock}) {
            if (stack) stack.push({entity: this.getEntityName(), frame: '_saveDependents: before _emitEvent: beforeSaveDependents'});

            // lifecycle event for extensions and model implementers
            return this._emitEvent('beforeSaveDependents', transaction).then((skipSave) => {
                if (stack) stack.push({entity: this.getEntityName(), frame: '_saveDependents: after _emitEvent: beforeSaveDependents', skipSave: skipSave});

                if (skipSave) return this._emitEvent('afterSaveDependents', transaction);
                else {
                    if (stack) stack.push({entity: this.getEntityName(), frame: '_saveDependents: before _saveMappings/_saveBelongsTo'});

                    // save mappings && belongTos
                    return Promise.all([
                        this._saveMappings({transaction, dontReload, stack, lock}), 
                        this._saveBelongsTo({transaction, dontReload, stack, lock})
                    ]).then(() => {
                        if (stack) stack.push({entity: this.getEntityName(), frame: '_saveDependents: after _saveMappings/_saveBelongsTo'});

                        return this._emitEvent('afterSaveDependents', transaction);
                    });
                }
            });
        }





        /*
         * save all items referencing this model (belongsTo)
         *
         * @param <Object> transaction -> execute the wueries on this
         * @param <Object> dontReload -> indicate wheter to reload the models
         */
        , _saveBelongsTo: function({transaction, dontReload, stack, lock}) {
            if (stack) stack.push({entity: this.getEntityName(), frame: '_saveBelongsTo: before _emitEvent: beforeSaveBelongsTo'});

            // lifecycle event for extensions and model implementers
            return this._emitEvent('beforeSaveBelongsTo', transaction).then((skipSave) => {
                if (stack) stack.push({entity: this.getEntityName(), frame: '_saveBelongsTo: after _emitEvent: beforeSaveBelongsTo', skipSave: skipSave});
                if (skipSave) return this._emitEvent('afterSaveBelongsTo', transaction);
                else {
                    return Promise.all(Object.keys(this._belongsTo).map((belongsToName) => {
                        this._belongsTo[belongsToName].setDebugMode(this._debugMode);
                        this._belongsTo[belongsToName].setPool(this._pool);

                        if (stack) stack.push({entity: this.getEntityName(), frame: '_saveBelongsTo: before relatingSet.save()', belongsToName: belongsToName});
                        return this._belongsTo[belongsToName].save(transaction, dontReload, stack, lock);
                    })).then(() => {
                        if (stack) stack.push({entity: this.getEntityName(), frame: '_saveBelongsTo: after relatingSet.save()'});

                        return this._emitEvent('afterSaveBelongsTo', transaction);
                    });
                }
            });
        }





        /*
         * save all mappings
         *
         * @param <Object> transaction -> execute the wueries on this
         * @param <Object> dontReload -> indicate wheter to reload the models
         */
        , _saveMappings: function({transaction, dontReload, stack, lock}) {
            if (stack) stack.push({entity: this.getEntityName(), frame: '_saveMappings: before _emitEvent: beforeSaveMappings'});

            // lifecycle event for extensions and model implementers
            return this._emitEvent('beforeSaveMappings', transaction).then((skipSave) => {
                if (stack) stack.push({entity: this.getEntityName(), frame: '_saveMappings: after _emitEvent: beforeSaveMappings', skipSave: skipSave});
                if (skipSave) return this._emitEvent('afterSaveMappings', transaction);
                else {
                    return Promise.all(Object.keys(this._mappings).map((mappingName) => {
                        this._mappings[mappingName].setDebugMode(this._debugMode);
                        this._mappings[mappingName].setPool(this._pool);

                        if (stack) stack.push({entity: this.getEntityName(), frame: '_saveMappings: before relatingSet.save()', mappingName: mappingName});
                        return this._mappings[mappingName].save(transaction, dontReload, stack, lock);
                    })).then(() => {
                        if (stack) stack.push({entity: this.getEntityName(), frame: '_saveMappings: after relatingSet.save()'});

                        return this._emitEvent('afterSaveMappings', transaction);
                    });
                 }
            });
        }






         /*
         * save all references
         *
         * @param <Object> transaction -> execute the wueries on this
         * @param <Object> dontReload -> indicate wheter to reload the models
         */
        , _saveReferences: function({transaction, dontReload, stack, lock}) {
            if (stack) stack.push({entity: this.getEntityName(), frame: '_saveReferences: before beforeSaveReferences'});

            // lifecycle event for extensions and model implementers
            return this._emitEvent('beforeSaveReferences', transaction).then((skipSave) => {
                if (stack) stack.push({entity: this.getEntityName(), frame: '_saveReferences: after beforeSaveReferences', skipSave: skipSave});

                if (skipSave) return this._emitEvent('afterSaveReferences', transaction);
                else {
                    return Promise.all(this._changedReferences.map((key) => {
                        const value  = this._references[key];
                        const column = this._columns[key].column;


                        // a query was set as reference
                        if (value === null || value === undefined) {
                            this[column.name] = null;
                            return Promise.resolve();
                        } else if (value.isQuery) {
                            value.limit(1);

                            value.setDebugMode(this._debugMode);
                            value.pool(this._pool);

                            if (stack) stack.push({entity: this.getEntityName(), frame: '_saveReferences: before value.findOne', reference: key});
                            return value.findOne(transaction).then((model) => {
                                if (stack) stack.push({entity: this.getEntityName(), frame: '_saveReferences: after value.findOne', reference: key});

                                if (!model) {
                                    this[column.name] = null;
                                    this[column.aliasName || column.referencedModel.name] = null;
                                } else {
                                    this[column.name] = model[column.referencedColumn];
                                    this[column.aliasName || column.referencedModel.name] = model;
                                }

                                return Promise.resolve();
                            });
                        } else {
                            if (value.isSaved()) {
                                this[column.name] = value[column.referencedColumn];
                                return Promise.resolve();
                            } else {

                                value.setDebugMode(this._debugMode);
                                value.setPool(this._pool);

                                if (stack) stack.push({entity: this.getEntityName(), frame: '_saveReferences: before value._save', reference: key});

                                return value.save(transaction, dontReload, stack, lock).then(() => {
                                    if (stack) stack.push({entity: this.getEntityName(), frame: '_saveReferences: after value._save', reference: key});

                                    this[column.name] = value[column.referencedColumn];
                                    return Promise.resolve();
                                });
                            }
                        }
                    })).then(() => {
                        return this._emitEvent('afterSaveReferences', transaction);
                    });
                }
            });
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





        , toJSON: function() {
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
                        if (this._references[keyName] && this[keyName].toJSON) {
                            obj[keyName] = this[keyName].toJSON();
                        }
                        // hidden ref
                        if (!type.undefined(this._values[column.column.name])) Object.defineProperty(obj, column.column.name, {value: this._values[column.column.name], enumerable: true});
                        break;

                    case 'scalar':
                        if (!type.undefined(this[keyName])) obj[keyName] = this[keyName];
                        break;

                    default:
                        throw new Error('Column type «'+column.type+'» is not supported!');
                }
            }.bind(this));

            // add data exposed by extensions
            if (this._serialize) {
                this._serialize.forEach(function(propertyName) {
                    if (undefined !== this[propertyName]) {
                        obj[propertyName] = this[propertyName];
                    }
                }.bind(this));
            }

            return obj;
        }
    });
})();
