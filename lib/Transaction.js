!function(){

    var   Class         = require('ee-class')
        , log           = require('ee-log')
        , debug         = require('ee-argv').has('debug-rollbacks')
        , type          = require('ee-types');



    module.exports = function(database) {
        return Object.create(database, {

            // database is an instance of an eventemitter, 
            // the transaction needs its own events, so we have
            // to redefine its storage here.
            ___events: {
                get: function(){
                    if (!Object.hasOwnProperty.call(this, '____events')) Class.define(this, '____events', Class({}).Writable());
                    return this.____events;
                }
            }

            // query logging
            , _queries: {value: []}


            // query queue
            , _queue: {value: []}

            // busy flag
            // false -> no transaction, need to get one
            // true -> busy getting a transaction
            // null -> got a transaction
            , _busy: {value: null, writable: true}


            , commit: {enumerable: true, value: function(callback){
                if (this._transaction) {
                    this._transaction.commit(function(err){
                        if (!err) this.emit('commit');
                        callback(err);
                    }.bind(this));
                }
                else if (this._transaction === false) callback();
                else callback(new Error('Cannot commit! The transaction has already eneded.'));
                this._endTransaction();
            }}


            , rollback: {enumerable: true, value: function(callback){
                if (this._transaction) {
                    if (debug) log.warn('Rolling back transaction, printing query stack:', this._queries);

                    this._transaction.rollback(function(err){
                        if (!err) this.emit('rollback');
                        callback(err);
                    }.bind(this));
                }
                else if (this._transaction === false) callback();
                else callback(new Error('Cannot rollback! The transaction has already eneded.'));   
                this._endTransaction();         
            }}


            , executeQuery: {enumerable: true, value: function(mode, query, callback){
                if (this._transaction) {
                    this._queries.push(query);
                    this._transaction.query(mode, query, callback);
                }
                else {
                    if (!this._busy) {
                        this._busy = true;

                        // get a connection
                        this._database.getConnection(false, function(err, connection){
                            if (err) callback(err);
                            else {
                                this._busy = null;
                                this._transaction = connection;
                                this._transaction.startTransaction();
                                this._transaction.on('end', this._endTransaction.bind(this));

                                // work on the queue befire executing this one
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


            , _endTransaction: {value: function(){
                this._transaction = null;               
            }}

            , _transaction: {value: false, writable:true, configurable: true}
        });
    }
}();
