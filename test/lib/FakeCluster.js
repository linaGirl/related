(function() {
    'use strict';


    let Class     = require('ee-class');
    let log       = require('ee-log');
    let Events    = require('ee-event-emitter');


    // fake db
    let FakeDBDefinition = require('./FakeDBDefinition');
    let FakeConnection   = require('./FakeConnection')



    /**
     * drop in replacement ffor the db cluster implementation.
     * this is used to be able to create meaningful tests
     * without having to rely on the complete backend structure
     *
     * only the integration tests make use of the normal db 
     * clsuter and real database backends.
     */



    module.exports = new Class({
        inherits: Events



        /**
         * fake the cluster load
         */
        , load: function() {
            return Promise.resolve(this);
        }






        /**
         * returns the fake db definition
         */
        , describe: function() {
            return new FakeDBDefinition().describe();
        }





        /**
         * fake query method, emits the 
         * query event, solely used for testing
         */
        , query: function(queryContext) {
            return new Promise((resolve, reject) => {
                this.emit('query', queryContext, resolve, reject);
            });
        }





        , getConnection: function() {
            return Promise.resolve(new FakeConnection(this));
        }
    });
})();
