(function() {
    'use strict';


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


            // the user may specifiy a pool he wants to execute a transaction on
            , pool: null


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

                if (options) {
                    if (options.pool) this.pool = options.pool;
                }

                // query queue (filled while waiting for the transaction
                // to be created)
                this._queue = [];

                // flags how many queries are currently beeing executedd
                this.runningQueries = 0;

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

                if (callback) {
                    this._commit().then((data) => {
                        callback(null, data);
                    }).catch(callback);
                }
                else return this._commit();            
            }






            , _commit: function() {
                if (this._transaction) {

                    return this._transaction.commit().then((data) => {
                        this.emit('commit');
                        this._endTransaction();
                        return Promise.resolve(data);
                    }).catch((err) => {
                        this._endTransaction();
                        return Promise.reject(err);
                    });
                }
                else if (this._transaction === false) {
                    this._endTransaction();
                    return Promise.resolve();
                }
                else {
                    this._endTransaction();
                    return Promise.reject(new Error('Cannot commit! The transaction has already ended.'));
                }
            }



            /*
             * commit the changes made by the tranaction, end the connection
             * we're based on
             */
            , rollback: function(callback) {

                if (callback) {
                    this._rollback().then((data) => {
                        callback(null, data);
                    }).catch(callback);
                }
                else return this._rollback();            
            }




            /*
             * rollback the changes made by the tranaction, end the connection
             * we're based on
             */
            , _rollback: function() {
                if (this._transaction) {

                    return this._transaction.rollback().then((data) => {
                        this.emit('rollback');
                        this._endTransaction();
                        return Promise.resolve(data);
                    }).catch((err) => {
                        this._endTransaction();
                        return Promise.reject(err);
                    });
                }
                else if (this._transaction === false) {
                    this._endTransaction();
                    return Promise.resolve();
                }
                else {
                    this._endTransaction();
                    return Promise.reject(new Error('Cannot rollback! The transaction has already ended.'));
                }                
            }







            /*
             * execute a query, this overwrites the same method on the database object
             * we're inheritiung from
             */
            , executeQuery: function(context) {

                // check for ended transactions
                if (this._transaction === null) return Promise.reject(new Error('Cannot execute query, the transaction has already ended!'));
                else {
                    return new Promise((resolve, reject) => {

                        // directly push the query to the queue
                        // so that it can be executed in the 
                        // right order
                        this._queue.push({
                              context: context
                            , resolve: resolve
                            , reject: reject
                        });


                        // execute directly if the transaction exists already
                        if (this._transaction) this.executeQueue();
                        else if (!this._busy) {

                            // mark as busy, aka connection in progress
                            // will not be reset because we cannot load multiple 
                            // connections on one transaction
                            this._busy = true;


                            // get a conenction and create the transaction
                            return this._database.getConnection(this.pool || 'write').then((connection) => {
                                this._transaction = connection;
                                this._transaction.createTransaction();
                                this._transaction.on('end', this._endTransaction.bind(this));

                                // check if the table lock must be exexuted
                                if (this._lockConfiguration) this.lock(this._lockConfiguration.table, this._lockConfiguration.mode, this._lockConfiguration.callback);

                                // execute queue
                                this.executeQueue();
                            }).catch((err) => {
                                this._transaction = null;
                                this.abortQueue(err);
                                return Promise.reject(err);
                            });
                        }
                    });
                }
            }





            /**
             * executes all items in the queue in order
             */
            , executeQueue: function() {
                if (this._queue && this._queue.length) {
                    if (this._transaction) {

                        // check if we have to wait until all running queries 
                        // have been executed
                        if (!this._queue[0].transactionExecutionWait || this.runningQueries === 0) {
                            const item = this._queue.shift();

                            // get the sql
                            this.renderQuery(this._transaction, item.context).then(() => {

                                this.runningQueries++;

                                // execute
                                return this._transaction.query(item.context).then((result) => {

                                    this.runningQueries--;
                                    if (this.runningQueries === 0) this.executeQueue();

                                    // return
                                    item.resolve(result);
                                }).catch((err) => {
                                    this.runningQueries--;

                                    throw err;
                                });


                                // execute next in line
                                this.executeQueue();
                            }).catch((err) => {
                                item.reject(err);

                                this.abortQueue(new Error(`The transaction has been rolled back because an earlier query failed: ${err.message}`));
                                this.rollback();
                            });
                        }
                    } else this.abortQueue(new Error('Cannot execute query, the transaction has already ended!'));
                }
            }




            /**
             * return an error to all items in the queue
             */
            , abortQueue: function(err) {
                if (this._queue) {
                    this._queue.forEach((item) => {
                        item.reject(err);
                    });

                    this._queue = null;
                }
            }






            /**
             * indicates if the trnsaction has endedd
             */
            , hasEnded: function() {
                return this._transaction === null;
            }






            , _getDatabase: function() {
                return this;
            }




            , _endTransaction: function() {
                this._transaction = null;
                this.abortQueue(new Error(`Cannot execute query, the transaction has ended!`));
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

                // apply stuff from the constructor to the new construcotr
                Object.keys(database[modelName]).forEach(function(propertyName) {
                    ModelConstructor[propertyName] = database[modelName][propertyName];
                });

                return ModelConstructor;
            }};
        });

        return new Class(classDefinition);
    }
})();
