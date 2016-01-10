(function() {
    'use strict';


    let log = require('ee-log');
    let QueryBuilder = require('../../src/QueryBuilder');



    /**
     * used for testing queries in the model implementeation
     */



    module.exports = class FakeQuery extends QueryBuilder {



        /**
         * fake the cluster load
         *
         * @param {error} err optional 
         * @param {*} data to return
         */
        constructor(err, data) {
            super();
            
            this.err = err;
            this.data = data;
        }






        /**
         * returns the fake db definition
         */
        find() {
            if (this.err) return Promise.reject(this.err);
            else return Promise.resolve(this.data);
        }






        /**
         * this and the find method should be the 
         * only methods used by the model
         */
        limit() {}
    };
})();
