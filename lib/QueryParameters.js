!function() {
    'use strict';



    var   Class     = require('ee-class')
        , log       = require('ee-log')
        , type      = require('ee-types')
        , debug     = require('ee-argv').has('dev-orm');





    /**
     * stores and processes query parameters liek
     * filters and selections
     */


    module.exports = new Class({



        // indicate that these are paramters
        , isQueryParamters: true





        /**
         * set up this query parameters class
         *
         * @returns <object> query parameters class instance
         */
        , init: function(parameters) {

            // store, processing is done lazil<
            this.parameters = parameters;
        }



    });
}();
