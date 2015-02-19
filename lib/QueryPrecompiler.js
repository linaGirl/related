!function() {
    'use strict';



    var   Class     = require('ee-class')
        , log       = require('ee-log')
        , type      = require('ee-types')
        , debug     = require('ee-argv').has('dev-orm');





    /**
     * contains generic precompiler functionality that
     * is used by both query strategies (parallel, serial)
     */


    module.exports = new Class({


        /**
         * set up the precompiler class
         *
         * @returns <object> options
         */
        , init: function(options) {

        }




    });
}();
