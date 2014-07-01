!function(){

    var   Class         = require('ee-class')
        , log           = require('ee-log')
        , debug         = require('ee-argv').has('debug-rollbacks')
        , type          = require('ee-types');



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


            , createTransaction: {value: function() {
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
                    this._queries.push(query);
                    this._transaction.query(mode, query, callback);
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

                                // work on the queue befire executing this one
                                this._queue.forEach(function(query){
                                    this.executeQuery(query.mode, query.query);
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
                    return database[modelName].apply(this, Array.prototype.splice.call(arguments));
                }
            }

            transactionInstanceDeifinition[modelName] = {value: ModelConstructor};
        }.bind(this));

        
        instance = Object.create(database, transactionInstanceDeifinition);
        return instance;
    }
}();
