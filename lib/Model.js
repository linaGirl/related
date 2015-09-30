!function(){

    var   Class         = require('ee-class')
        , Arguments     = require('ee-arguments')
        , async         = require('ee-async')
        , EventEmitter  = require('ee-event-emitter')
        , type          = require('ee-types')
        , log           = require('ee-log')
        , crypto        = require('crypto')
        , Query         = require('./Query')
        , ModelCloner   = require('./ModelCloner')
        , clone         = require('./clone')
        , Set           = require('./Set')
        , ORM;





    module.exports = new Class({
        inherits: EventEmitter


        , init: function(options) {
            Class.define(this, '_defintion'         , Class(options.definition));
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
            Class.define(this, '_host'              , Class(null).Writable().Configurable());
            Class.define(this, '_queue'             , Class([]));

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
         * sets the host for all transactions executed on this model
         */
        , setHost: function(host) {
            this._host = host;
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

            if (type.object(item) && item instanceof Set) {
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


            (transaction || this._getDatabase()).executeQuery({query: query, debug: this._debugMode, host: this._host, callback: function(err, data) {
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
            }.bind(this)});

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



        /**
         * remove a key from the changed values so it will
         * not end up in queries
         */
        , removeChangedValueKey: function(keyName) {
            var index = this._changedValues.indexOf(keyName);
            if (index >= 0) this._changedValues.splice(index, 1);
        }



        /**
         * remove a value so it wont be stored in the db
         */
        , removeValue: function(keyName) {
            this.removeChangedValueKey(keyName);
            if (this._values[keyName]) delete this._values[keyName];
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
                , dontResume    = false
                , index
                , callNext;




            if (listeners && listeners.length) {
                index = 0;


                // this is the callback for all listeners
                // it should break and return when an error
                // happened or the listener tells it to do so
                callNext = function(err, endNow) {
                    if (err) callback(err);
                    else if (index++ === listeners.length) callback(null, (endNow || dontResume));
                    else if (index > listeners.length) throw new Error('The related ORM extension event listener for the event «'+event+'» fired twice!');
                    else {
                        if (endNow) dontResume = true;
                        listeners[index-1].apply(null, args);
                    }
                }.bind(this);



                // remove the the original callback
                args = args.slice(0, args.length-1);

                // add myself as first parameter
                args.unshift(this);

                // add my own callback
                args.push(callNext);

                // aaand go!
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
                , callback      = args.getFunction()
                , transaction   = args.getObject();

            if (typeof callback !== 'function') {
                return new Promise(function(resolve, reject) {
                    this._executeDelete(function(err, data) {
                        if (err) reject(err);
                        else resolve(data);
                    }.bind(this), transaction, arguments);
                }.bind(this));
            }
            else {
                return this._executeDelete(callback || function(){}, transaction, arguments);
            }
        }



        , _executeDelete: function(callback, transaction, args) {

            // we need to get a lock, else the orm will fail
            if (!this._getLock('delete', args)) return;

            if (transaction || this._getDatabase().isTransaction()) {
                this._delete(transaction || this._getDatabase().getTransaction(), function(err) {
                    callback(err);
                    this._freeLock();
                }.bind(this));
            }
            else {
                transaction = this._getDatabase().createTransaction(this._host);

                this._delete(transaction, function(err){
                    if (err) {
                        transaction.rollback(function(transactionErr){
                            if (transactionErr) callback(transactionErr);
                            else callback(err);
                            this._freeLock();
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
                            this._freeLock();
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
                if (!query.select) query.select = [];

                query.limit = 1;

                this._defintion.primaryKeys.forEach(function(key){
                    query.filter[key] = this[key];
                    query.select.push(key);
                }.bind(this));

                if (!Object.keys(query.filter).length) {
                    log.dir(query);
                    throw new Error('Failed to create proper delete query for model «'+this.getEntityName()+'», no filter was created (see query definition above)');
                }
                else {
                    this._emitOnCommit(transaction, 'afterDeleteCommit');
                    this._emitEvent('beforeDelete', transaction, function(err, skipDelete) {
                        if (err) callback(err);
                        else if (skipDelete) this._emitEvent('afterDelete', transaction, callback);
                        else {
                            transaction.executeQuery({mode: 'delete', query: query, debug: this._debugMode, callback: function(err){
                                if (err) callback(err);
                                else this._emitEvent('afterDelete', transaction, callback);
                            }.bind(this)});
                        }
                    }.bind(this));
                }
            }
            else callback(new Error('Cannot delete model «'+this.getEntityName()+'», it wasn\'t loaded from the database!'));
        }



        /*
         * tries to get a lock for the model becaus eparallel
         * asynchronous actions will let the orm fail.
         * if the item is locked already the action will executed
         * as soon as the lock is removed.
         */
        , _getLock: function(fn, args) {
            if (this._busy) {
                this._queue.push({
                      fn    : fn
                    , args  : args
                });
                return false;
            }

            this._busy = true;
            return true;
        }


        /*
         * removes the lock, executes queried items
         */
        , _freeLock: function() {
            if (this._queue.length) {
                process.nextTick(function() {
                    this._busy = false;
                    var item = this._queue.shift();
                    this[item.fn].apply(this, Array.prototype.slice.call(item.args));
                }.bind(this));
            }
            else this._busy = false;
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
            var   noReload = false
                , l = arguments.length
                , i = 0
                , args = new Array(l)
                , callback, transaction;

            for (; i < l; i++) {
                args.push(arguments[i]);
                if (type.function(arguments[i]))     callback    = arguments[i];
                else if (type.boolean(arguments[i])) noReload    = arguments[i];
                else if (type.object(arguments[i]))  transaction = arguments[i];
            }


            if (typeof callback !== 'function') {

                // return promise
                return new Promise(function(resolve, reject) {
                    this._executeSave(function(err, data) {
                        if (err) reject(err);
                        else resolve(data);
                    }.bind(this), noReload, transaction, args);
                }.bind(this));
            }
            else {
                return this._executeSave(callback || function(){}, noReload, transaction, args);
            }
        }




        , _executeSave: function(callback, noReload, transaction, args) {

            // we need to get a lock, else the orm will fail
            if (!this._getLock('save', args)) return;

            // either we get a transaction from the outside or
            // we have to create our own
            if (transaction || this._getDatabase().isTransaction()) {
                this._save(transaction || this._getDatabase().getTransaction(), noReload, function(err) {
                    callback(err, this);
                    this._freeLock();
                }.bind(this));
            }
            else {
                // create a new transaction
                transaction = this._getDatabase().createTransaction(this._host);

                // transaction management is required here
                this._save(transaction, noReload, function(err){
                    if (err) {
                        transaction.rollback(function(transactionErr) {
                            if (transactionErr) callback(transactionErr);
                            else callback(err);
                            this._freeLock();
                        }.bind(this));
                    }
                    else {
                        transaction.commit(function(err){
                            if (err) callback(err);
                            else {
                                this._changedValues = [];
                                if (noReload) {
                                    callback(null, this);
                                    this._freeLock();
                                }
                                else {
                                    this.reload(function(err) {
                                        if (err) callback(err);
                                        else callback(null, this);
                                        this._freeLock();
                                    }.bind(this));
                                }
                            }
                        }.bind(this));
                    }
                }.bind(this));
            }

            return this;
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
                this._values[columnName] = JSON.stringify(this._values[columnName]);
            }.bind(this));
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
            var hasChanges = this._hasChanges
                , isFromDB = this._fromDb;

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

            // need to reset the source status
            transaction.once('rollback', function() {
                // reset to original status
                this._fromDb = isFromDB;
                this._hasChanges = hasChanges;
            }.bind(this));


            // its time to check for changes on json type column
            this._checkJsonColumns();


            // make sure to emit this event when the transaction was successsfull
            this._emitOnCommit(transaction, 'afterSaveCommit');

            // this is a pretty unreliable event, you are not going to
            // know if the save is going to succeed
            this._emitEvent('beforeSave', transaction, function(err, skipSave) {
                if (err) callback(err);
                else if (skipSave) this._emitEvent('afterSave', transaction, callback);
                else {
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
                                        else this._emitEvent('afterSave', transaction, callback);
                                    }.bind(this));
                                }
                            }.bind(this);


                            // so, now we going either to update or save a new record
                            if (this.isFromDatabase()) this._update(transaction, query, afterSaveCallback);
                            else this._insert(transaction, query, afterSaveCallback);
                        }
                    }.bind(this));
                }
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

            // goin to emit events on commit
            this._emitOnCommit(transaction, 'afterInsertCommit', this);

            this._emitEvent('beforeInsert', transaction, function(err, skipInsert) {
                if (err) callback(err);
                else if (skipInsert) this._emitEvent('afterInsert', transaction, callback);
                else {
                     // set the query values
                    query.values = this._values;

                    transaction.executeQuery({mode: 'insert', query: query, debug: this._debugMode, callback: function(err, result) {
                        if (err) callback(err);
                        else {
                            // this is littlebit weird, but it indicates that
                            // the db returned a valid dataset
                            if (result.type === 'id') {
                                // mar as from db, this will be reset on rollback
                                this._fromDb = true;

                                // yeah, we got some result from mysql which can't handle compund keys
                                if (result.id !== undefined) {
                                    // mysql doesn't support compund primaries, check fro that
                                    if (this._defintion.primaryKeys.length === 1) {
                                        this[this._defintion.primaryKeys[0]] = result.id;
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
                                else throw new Error('The model «'+this.getEntityName()+'» got unexpected data, you should update your node modules!');

                                // yeh, we're done, emit the afterinsert event
                                this._emitEvent('afterInsert', transaction, callback);
                            }
                            else throw new Error('Unexpected return value while fro minsert into model «'+this.getEntityName()+'». please file an issue');
                        }
                    }.bind(this)});
                }
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

            // goin to emit events on commit
            this._emitOnCommit(transaction, 'afterUpdateCommit', this);

            this._emitEvent('beforeUpdate', transaction, function(err, skipUpdate) {
                if (err) callback(err);
                else if (skipUpdate) this._emitEvent('afterUpdate', callback, transaction, callback);
                else {
                     // get changed values
                    query.values = this._getChangedValues()

                    // we're going to do nothing if there aren't any changes
                    if (!Object.keys(query.values).length) return this._emitEvent('afterUpdate', transaction, callback);
                    else if (this.hasChanges()) {

                        if (!query.select) query.select = [];

                        query.limit = 1;

                        // add the filter to the query
                        this._defintion.primaryKeys.forEach(function(key) {
                            query.filter[key] = this[key];
                            query.select.push(key)
                        }.bind(this));

                        // do it
                        transaction.executeQuery({mode: 'update', query: query, debug: this._debugMode, callback: function(err) {
                            if (err) callback(err);
                            else this._emitEvent('afterUpdate', transaction, callback);
                        }.bind(this)});
                    }
                    else callback();
                }
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
            this._emitEvent('beforeSaveDependents', transaction, function(err, skipSave) {
                if (err) callback(err);
                else if (skipSave) this._emitEvent('afterSaveDependents', transaction, callback);
                else {
                    async.wait(function(done) {
                        this._saveMappings(transaction, noReload, done);
                    }.bind(this)
                    , function(done) {
                        this._saveBelongsTo(transaction, noReload, done);
                    }.bind(this), function(err) {
                        if (err) callback(err);
                        else this._emitEvent('afterSaveDependents', transaction, callback);
                    }.bind(this));
                }
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
            this._emitEvent('beforeSaveBelongsTo', transaction, function(err, skipSave) {
                if (err) callback(err);
                else if (skipSave) this._emitEvent('afterSaveBelongsTo', transaction, callback);
                else {
                    async.each(Object.keys(this._belongsTo), function(belongsToId, next){
                        this._belongsTo[belongsToId].setDebugMode(this._debugMode);
                        this._belongsTo[belongsToId].setHost(this._host);
                        this._belongsTo[belongsToId].save(transaction, noReload, next);
                    }.bind(this), function(err) {
                        if (err) callback(err);
                        else this._emitEvent('afterSaveBelongsTo', transaction, callback);
                    }.bind(this));
                }
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
             this._emitEvent('beforeSaveMappings', transaction, function(err, skipSave) {
                if (err) callback(err);
                else if (skipSave) this._emitEvent('afterSaveMappings', transaction, callback);
                else {
                    async.each(Object.keys(this._mappings), function(mappingId, next){
                        this._mappings[mappingId].setDebugMode(this._debugMode);
                        this._mappings[mappingId].setHost(this._host);
                        this._mappings[mappingId].save(transaction, noReload, next);
                    }.bind(this), function(err) {
                        if (err) callback(err);
                        else this._emitEvent('afterSaveMappings', transaction, callback);
                    }.bind(this));
                }
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
            this._emitEvent('beforeSaveRefernces', transaction, function(err, skipSave) {
                if (err) callback(err);
                else if (skipSave) this._emitEvent('afterSaveReferences', transaction, callback);
                else {

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

                            value.setDebugMode(this._debugMode);

                            value.host(this._host);

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
                            }.bind(this), transaction);
                        }
                        else {
                            if (value.isSaved()) {
                                this[column.name] = value[column.referencedColumn];
                                next();
                            }
                            else {
                                value.setDebugMode(this._debugMode);


                                value.setHost(this._host);


                                value._save(transaction, noReload, function(err){
                                    if (err) next(err);
                                    else {
                                        this[column.name] = value[column.referencedColumn];
                                        next();
                                    }
                                }.bind(this));
                            }
                        }
                    }.bind(this), function(err){
                        if (err) callback(err);
                        else this._emitEvent('afterSaveReferences', transaction, callback);
                    }.bind(this));
                }
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
}();
