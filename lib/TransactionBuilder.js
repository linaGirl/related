!function(){

    var   Class         = require('ee-class')
        , log           = require('ee-log')
        , debug         = require('ee-argv').has('debug-rollbacks') || require('ee-argv').has('debug-orm-errors')
        , type          = require('ee-types');



    module.exports = function(database) {

        
        var classDefinition = {
            inherits: database


            // differnet locks that can be obtained by the user on the transaction
            // the orm does its best to get a consistent behavior across the different
            // rdbms systems, which is sadly not possible with locks.
            // see the lock description inside the specific driver
            , LOCK_READ:        'LOCK_READ'
            , LOCK_WRITE:       'LOCK_WRITE'
            , LOCK_EXCLUSIVE:   'LOCK_EXCLUSIVE'


            // busy flag
            // false -> no transaction, need to get one
            // true -> busy getting a transaction
            // null -> got a transaction
            , _busy: null


            // holds the pointer to the conenction with the transaction
            // false -> not initialized
            // object -> active transaction
            // null -> transaction eneded
            , _transaction: false


            /*
             * initialize class variable, make sure to interceopt all calls to the models
             * and to inject the transaction iinto them
             */
            , init: function(options) {

                // query queue (filled while waiting for the transaction 
                // to be created)
                this._queue = [];

                // debug vraiables, query logging
                if (debug) this._queries = [];
            }



            /*
             * if anony need to know if we're a transaction
             */
            , isTransaction: function() {
                return true;
            }


            /*
             * return myself
             */
            , getTransaction: function() {
                return this;
            }



            /*
             * apply a table lock
             */
            , lock: function(table, mode, callback) {
                if (this._transaction) this._transaction.lock(this._databaseName, table, mode, (callback || function(){}));
                else {
                    // store the lock configuration, ti will be applied as soon as
                    // the tranactio was created
                    this._lockConfiguration = {
                          table     : table
                        , mode      : mode
                    };

                    if (callback) callback();
                }
            }


            /*
             * commit the changes made by the tranaction, end the connection
             * we're based on
             */
            , commit: function(callback) {
                if (this._transaction) {
                    this._transaction.commit(function(err) {
                        if (!err) this.emit('commit');
                        if (callback) callback(err);
                    }.bind(this));
                }
                else if (this._transaction === false) callback();
                else if (callback) callback(new Error('Cannot commit! The transaction has already eneded.'));
                this._endTransaction();
            }



            /*
             * rollback the changes made by the tranaction, end the connection
             * we're based on
             */
            , rollback: function(callback){
                if (this._transaction) {
                    if (debug) log.warn('Rolling back transaction, printing query stack:', this._queries);

                    this._transaction.rollback(function(err) {
                        if (!err) this.emit('rollback');
                        if (callback) callback(err);
                    }.bind(this));
                }
                else if (this._transaction === false) callback();
                else if (callback) callback(new Error('Cannot rollback! The transaction has already eneded.'));   
                this._endTransaction();         
            }


            /*
             * execute a query, this overwrites the same method on the database object
             * we're inheritiung from
             */
            , executeQuery: function(mode, query, callback) {
                if (this._transaction) {
                    this._transaction.query(mode, query, function(err, results) {
                        if (debug) this._queries.push({query: query, mode: mode, err: err, errorMessage: err ? err.message : null, results: results});
                        callback(err, results);
                    }.bind(this));
                }
                else {
                    if (!this._busy) {
                        this._busy = true;

                        // get a connection
                        this._database.getConnection(false, function(err, connection) {
                            if (err) {
                                delete this._queue;
                                callback(err);
                            }
                            else {
                                this._busy = null;
                                this._transaction = connection;
                                this._transaction.startTransaction();
                                this._transaction.on('end', this._endTransaction.bind(this));

                                // check if the table lock must be exexuted
                                if (this._lockConfiguration) this.lock(this._lockConfiguration.table, this._lockConfiguration.mode, this._lockConfiguration.callback);

                                // work on the queue before executing this one
                                this._queue.forEach(function(query){
                                    this.executeQuery(query.mode, query.query, query.callback);
                                }.bind(this));

                                this.executeQuery(mode, query, callback);
                            }
                        }.bind(this));
                    }
                    else {
                        // queue connection
                        this._queue.push({
                              mode      : mode
                            , query     : query
                            , callback  : callback
                        });
                    }
                }
            }


            , _getDatabase: function() {
                return this;
            }


            , _endTransaction: function() {
                this._transaction = null;         
                delete this._queue;      
            }
        };

        

        // we need to proxy calls on the 
        // models to give them the correct scope ...
         Object.keys(database._models).forEach(function(modelName) {

            // dynamically bind the context
            classDefinition[modelName] = {get: function() {
                var transactionContext = this;

                var ModelConstructor = function(options, relatingSets) {
                    if (this instanceof ModelConstructor) {
                        return new database[modelName](transactionContext, options, relatingSets);
                    }
                    else {
                        return database[modelName].apply(transactionContext, Array.prototype.slice.call(arguments));
                    }
                };

                return ModelConstructor;
            }};
        });

        return new Class(classDefinition);
    }


/*
    module.exports = function(database) {
        var   transactionInstanceDeifinition
            , instance;


        transactionInstanceDeifinition = {

            // database is an instance of an eventemitter, 
            // the transaction needs its own events, so we have
            // to redefine its storage here.
            ___events: {
                get: function(){
                    if (!Object.hasOwnProperty.call(this, '____events')) Class.define(this, '____events', Class({}).Writable());
                    return this.____events;
                }
            }


            // differnet locks that can be obtained by the user on the transaction
            // the orm does its best to get a consistent behavior across the different
            // rdbms systems, which is sadly not possible with locks.
            // see the lock description inside the specific driver
            , LOCK_READ:        {enumerable: true, value: 'LOCK_READ'}
            , LOCK_WRITE:       {enumerable: true, value: 'LOCK_WRITE'}
            , LOCK_EXCLUSIVE:   {enumerable: true, value: 'LOCK_EXCLUSIVE'}


            // query logging
            , _queries: {value: []}


            // query queue
            , _queue: {value: []}

            // busy flag
            // false -> no transaction, need to get one
            // true -> busy getting a transaction
            // null -> got a transaction
            , _busy: {value: null, writable: true}


            , isTransaction: {value:function(){
                return true;
            }}


            , getTransaction: {value: function(){
                return this;
            }}




            , commit: {enumerable: true, value: function(callback){
                if (this._transaction) {
                    this._transaction.commit(function(err){
                        if (!err) this.emit('commit');
                        if (callback) callback(err);
                    }.bind(this));
                }
                else if (this._transaction === false) callback();
                else if (callback) callback(new Error('Cannot commit! The transaction has already eneded.'));
                this._endTransaction();
            }}

           

            , lock: {enumerable: true, value: function(table, mode, callback) {
                if (this._transaction) this._transaction.lock(this._databaseName, table, mode, (callback || function(){}));
                else if (callback) {
                    this._lockConfiguration = {
                          table     : table
                        , mode      : mode
                    };
                    callback();
                }
            }}


            , rollback: {enumerable: true, value: function(callback){
                if (this._transaction) {
                    if (debug) log.warn('Rolling back transaction, printing query stack:', this._queries);

                    this._transaction.rollback(function(err){
                        if (!err) this.emit('rollback');
                        if (callback) callback(err);
                    }.bind(this));
                }
                else if (this._transaction === false) callback();
                else if (callback) callback(new Error('Cannot rollback! The transaction has already eneded.'));   
                this._endTransaction();         
            }}


            , executeQuery: {enumerable: true, value: function(mode, query, callback) {
                
                if (this._transaction) {
                    this._transaction.query(mode, query, function(err, results) {
                        if (debug) this._queries.push({query: query, mode: mode, err: err, errorMessage: err ? err.message : null, results: results});
                        callback(err, results);
                    }.bind(this));
                }
                else {
                    if (!this._busy) {
                        this._busy = true;

                        // get a connection
                        this._database.getConnection(false, function(err, connection) {
                            if (err) callback(err);
                            else {
                                this._busy = null;
                                this._transaction = connection;
                                this._transaction.startTransaction();
                                this._transaction.on('end', this._endTransaction.bind(this));

                                // check if the table lock must be exexuted
                                if (this._lockConfiguration) this.lock(this._lockConfiguration.table, this._lockConfiguration.mode, this._lockConfiguration.callback);

                                // work on the queue before executing this one
                                this._queue.forEach(function(query){
                                    this.executeQuery(query.mode, query.query, query.callback);
                                }.bind(this));

                                this.executeQuery(mode, query, callback);
                            }
                        }.bind(this));
                    }
                    else {
                        // queue connection
                        this._queue.push({
                              mode      : mode
                            , query     : query
                            , callback  : callback
                        });
                    }
                }
            }}


            , _getDatabase: { value: function() {
                return this;
            }}


            , _endTransaction: {value: function(){
                this._transaction = null;               
            }}

            , _transaction: {value: false, writable:true, configurable: true}
        };
            
               
        
        // we need to proxy calls on the 
        // models to give them the correct scope ...
       Object.keys(database._models).forEach(function(modelName) {
            var ModelConstructor = function(options, relatingSets) {
                if (this instanceof ModelConstructor) {
                    return new database[modelName](instance, options, relatingSets);
                }
                else {
                    return database[modelName].apply(instance, Array.prototype.slice.call(arguments));
                }
            }

            transactionInstanceDeifinition[modelName] = {value: ModelConstructor};
        }.bind(this));

        
        instance = Object.create(database, transactionInstanceDeifinition);
        return instance;
    }*/
}();
