!function() {
    'use strict';



    var   Class                 = require('ee-class')
        , log                   = require('ee-log')
        , type                  = require('ee-types')
        , debug                 = require('ee-argv').has('dev-orm')
        , Set                   = require('./Set')
        , Query                 = require('./Query')
        , JoinStatement         = require('./JoinStatement')
        , QueryCompiler         = require('./QueryCompiler')
        , QueryBuilderMethods   = require('./QueryBuilderMethods')
        , Promise               = Promise || require('es6-promise').Promise
        , ORM;





    /**
     * this is the user facing query builder interface 
     * which has automatically generated interfaces
     * for querying the database. Please pay attention
     * that neither variables nor methods start with the
     * words «get», «fetch» or «join»
     */


    module.exports = new Class({
        

        /*
         * execute the query, either using a classic callback or using a promise
         * 
         * @param <Function> optional callback 
         * @param <Object> optional transaction 
         * @param <String> action to execute 
         */
          _execute: function(callback, transaction, action, arg) {
            if (typeof callback !== 'function') {
                // callback is transaction
                if (callback) transaction = callback;

                // return promise
                return new Promise(function(resolve, reject) {
                    new QueryCompiler({
                          orm               : this._orm
                        , getDatabase       : this._getDatabase
                        , resource          : this._rootResource
                        , transaction       : transaction
                    })[action](function(err, data) {
                        if (err) reject(err);
                        else resolve(data);
                    }.bind(this), arg);
                }.bind(this));  
                                            
            }
            else {
                 new QueryCompiler({
                      orm               : this._orm
                    , getDatabase       : this._getDatabase
                    , resource          : this._rootResource
                    , transaction       : transaction
                })[action](callback, arg);
            }
        }


        /*
         * execute a select query. All parameters can be passed in any
         * order. the returned data may be inconsistent (fetched in n 
         * calls using the same filter but a different offset) when 
         * working with the setSize parameter
         *
         * when a setSize is passed to this function a callback is not
         * optional, not even when using promises. the callback gets 
         * called until there is no more data or tha action was aborted
         * 
         * @returns             this or a promise
         * 
         * @param <Number>      optional, set size to return. the  
         *                      callback will be called until all  
         *                      records were returned
         * @param <Function>    optional, callback that will be called 
         *                      with the results
         * @param <Object>      optional, a transaction object on which
         *                      the query must be executed. 
         */
        , find: function() {
            var   i = 0
                , l = arguments.length
                , query = this.getrootResource().getQuery()
                , offset, callback, transaction, setSize;

            for (; i < l; i++) {
                switch(typeof arguments[i]) {
                    case 'function': 
                        callback = arguments[i];
                        break;

                    case 'number':
                        setSize = arguments[i];
                        break;

                    case 'object':
                        transaction = arguments[i];
                        break;
                }
            }

            // maybe we need to fetch the data in n sets
            if (setSize) {
                if (!callback) return Promise.reject(new Errro('The «find» method was called with the setSize parameter but without a callback. Please call this method with a callback which will be called for each set!'));

                // get the start offset
                offset = query.getOffset();

                // set limit
                query.setLimit(setSize);


                // always return a promise, when in callback mode
                // this will be ignored by the user and he has to observe
                // by himself when he got the last set which is if the 
                // last parameter is delivered. 
                return new Promise(function(resolve, reject) {
                    var   abort
                        , next;

                    abort = function() {
                        reject(new Error('qb.find: action aborted by the user!'));
                    };

                    next = function(err) {
                        if (err && err instanceof Error) reject(err);
                        else {
                            // set new offset
                            query.setOffset(offset);

                            // increase offset
                            offset += setSize;

                            // get data
                            this._execute(function(err, data) {
                                if (err) {
                                    callback(err);
                                    reject(err);
                                }
                                else {
                                    // check if we're finished
                                    if (data.length < setSize) {
                                        callback(null, data, function(){}, function(){}, true);
                                        resolve();
                                    }

                                    // let the user get more records
                                    else callback(null, data, next, abort, false);
                                }
                            }, transaction, 'find');
                        }
                    }.bind(this);

                    // first round
                    next();
                }.bind(this));
            }
            else return this._execute(callback, transaction, 'find');
        }


        /*
         * find one record. pass arguments in any order.
         *
         * @param <Object> optional, transaction
         * @param <Function> optional, callback
         *
         */
        , findOne: function() {
            var   i = 0
                , l = arguments.length
                , callback, transaction;

            for (; i < l; i++) {
                switch(typeof arguments[i]) {
                    case 'function': 
                        callback = arguments[i];
                        break;

                    case 'object':
                        transaction = arguments[i];
                        break;
                }
            }

            return this._execute(callback, transaction, 'findOne');
        }


        /*
         * count records. pass arguments in any order.
         *
         * @param <Object> optional, transaction
         * @param <Function> optional, callback
         * @param <String> optional, column to count on
         *
         */
        , count: function() {
            var   i = 0
                , l = arguments.length
                , callback, transaction, column;

            for (; i < l; i++) {
                switch(typeof arguments[i]) {
                    case 'function': 
                        callback = arguments[i];
                        break;

                    case 'object':
                        transaction = arguments[i];
                        break;

                    case 'string':
                        column = arguments[i];
                        break;
                }
            }


            return this._execute(callback, transaction, 'count', column);
        }



        /*
         * bulk delete. pass arguments in any order.
         *
         * @param <Object> optional, transaction
         * @param <Function> optional, callback
         *
         */
        , delete: function() {
            var   i = 0
                , l = arguments.length
                , callback, transaction;

            for (; i < l; i++) {
                switch(typeof arguments[i]) {
                    case 'function': 
                        callback = arguments[i];
                        break;

                    case 'object':
                        transaction = arguments[i];
                        break;
                }
            }

            return this._execute(callback, transaction, 'delete');
        }



        /*
         * bulk update. pass arguments in any order.
         *
         * @param <Object> optional, transaction
         * @param <Function> optional, callback
         * @param <Object> values to set on the records to update
         *
         */
        , update: function() {
            var   i = 0
                , l = arguments.length
                , callback, transaction, values;

            for (; i < l; i++) {
                switch(typeof arguments[i]) {
                    case 'function': 
                        callback = arguments[i];
                        break;

                    case 'object':
                        if (arguments[i] !== null && typeof arguments[i].isTransaction === 'function' && arguments[i].isTransaction()) transaction = arguments[i];
                        else values = arguments[i];
                        break;
                }
            }

            // check the types of the values
            Object.keys(values).forEach(function(columnName) {
                if (values[columnName] && this._definition.columns[columnName].jsTypeMapping === 'date' && !type.date(values[columnName])) values[columnName] = new Date(values[columnName]);
            }.bind(this));

            this._rootResource.query.values = values;

            return this._execute(callback, transaction, 'update');
        }
    });
}();
