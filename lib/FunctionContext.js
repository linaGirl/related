(function() {
    'use strict';



    let Class = require('ee-class');
    let log = require('ee-log');






    module.exports = new Class({

        // the name of the function this context is used for
          functionName: null

        // the functions definition
        , definition: null 

        // the db used for serveral things
        , db: null

        // the pool to execute this function on
        , pool: 'write'

        // transaction to use
        , transaction: null

        // debug mode
        , debug: false







        /**
         * class constructor, store the passed values
         *
         * @param {object} db the db object
         * @param {object|null} the function definition if available
         * @param {string} functionName the name of the function to execute
         */
        , init: function(db, definition, functionName) {
            this.functionName = functionName;
            this.db = db;
            if (definition) this.definition = definition;
        }










        /**
         * use a specific transaction for this query
         *
         * @param {object} transaction
         *
         * @returns {object} this
         */
        , transaction: function(transaction) {
            if (this.pool !== 'write') throw new Error('Cannot use a transaction when the pool was set manually!');
            else {
                this.transaction = transaction;
                return this;
            }
        }











        /**
         * executes the function call
         *
         * @returns {promise}
         */
        , execute: function() {
            if (!this.definition) return Promise.reject(new Error(`Cannot execute the function ${this.functionName}, the function was not detected on the database!`));
            else {
                let args = [];

                for (let i = 0, l = arguments.length; i < l; i++) args.push(arguments[i]);

                
                let context = new QueryContext({
                      pool: this.pool
                    , debug: this.debug
                    , ast: {
                          kind: 'functionQuery'
                        , name: functionName
                        , database: this._databaseName
                        , parameters: args
                        , definition: this.definition
                    }
                });

                // execute
                return this.db.executeASTQuery(context, this.transaction);
            }
        }











        /**
         * let the user select the pool to execute the function on
         * 
         * @param {string} poolName
         *
         * @returns {object} this
         */
        , pool: function(poolName) {
            this.pool = poolName;
            return this;
        }










        /**
         * enables the debug mode
         *
         * @returns {object} this
         */
        , debug: function() {
            this.debug = true;
            return this;
        }
    });
})();
