!function() {
    'use strict';



    var   Class             = require('ee-class')
        , log               = require('ee-log')
        , type              = require('ee-types')
        , debug             = require('ee-argv').has('dev-orm')
        , QueryPrecompiler  = require('./QueryPrecompiler');





    /**
     * contains parallel precompiler functionality that
     * will execute all child queries at once
     *
     *   1         2           2            2   <--- query level
     * 
     * root --- child1 ----- child2
     *             \
     *              -------- child3 ------ child4
     *
     * first the root query is executed, after that all
     * children are executed in parallel
     *
     * this strategy requires us to apply the completet filter
     * set to all subqueries, also the filter from other branches
     * and from all parents but the root which was loaded before
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
