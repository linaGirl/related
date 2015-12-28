(function() {
    'use strict';


    let Class     = require('ee-class');
    let log       = require('ee-log');


    // fake db
    let FakeDBDefinition = require('./FakeDBDefinition');



    /**
     * drop in replacement ffor the db cluster implementation.
     * this is used to be able to create meaningful tests
     * without having to rely on the complete backend structure
     *
     * only the integration tests make use of the normal db 
     * clsuter and real database backends.
     */



    module.exports = new Class({



        load: function() {
            return Promise.resolve(this);
        }




        , describe: function() {
            return new FakeDBDefinition().describe();
        }
    });
})();
