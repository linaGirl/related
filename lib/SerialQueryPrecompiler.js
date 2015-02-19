!function() {
    'use strict';



    var   Class             = require('ee-class')
        , log               = require('ee-log')
        , type              = require('ee-types')
        , debug             = require('ee-argv').has('dev-orm')
        , QueryPrecompiler  = require('./QueryPrecompiler');





    /**
     * contains serial precompiler functionality that
     * will execute all child queries one level after another
     *
     *   1         2           3             4   <--- query level
     * 
     * root --- child1 ----- child2
     *             \
     *              -------- child3 ------ child4
     *
     * first the root query is executed, after that child 1,
     * after that child 2 and so forth
     *
     * using this strategy all filters of the childs of the 
     * same branch must be applied to the current level
     */




    module.exports = new Class({
        inherits: QueryPrecompiler



        
        /**
         * set up the precompiler class
         *
         * @returns <object> options
         */
        , init: function(options) {

        }






        /**
         * prepares the query so that it can be passed
         * to the sql soecific compiler
         *
         * @param <object> query builder instance
         *
         * @returns <object> prepares query
         */
        , compile: function(rootQueryBuilder) {

        }
    });
}();
