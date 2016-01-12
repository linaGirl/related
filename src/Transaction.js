(function() {
    'use strict';

    let log = require('ee-log');




    // a little map of all transaction status options
    let transactionStatus = new Map();

    transactionStatus.set('new', 100);
    transactionStatus.set('initializing', 200);
    transactionStatus.set('initialized', 300);
    transactionStatus.set('ending', 400);
    transactionStatus.set('ended', 500);




    /**
     * build a fast transaction class
     *
     * @param {object} options object containing a ref to the db
     *
     * @returns {function} the transactions constructor
     */
    module.exports = function(options) {


        /**
         * transaction
         */
        class Transaction {
            







            /**
             * flags if the transaction is ready for queries
             *
             * @returns {boolean}
             */
            isReady () {
                return this.status < transactionStatus.get('ending');
            }




            /**
             * flags if the transaction has ended
             *
             * @returns {boolean}
             */
            hasEnded () {
                return this.status >= transactionStatus.get('ended');
            }
        }

        



        // make the database accessible to all transactions
        Transaction.prototype.database = options.database;


        // set the default status
        Transaction.prototype.status = transactionStatus.get('new');




        // return the generated query builder
        return Transaction;
    };
})();
