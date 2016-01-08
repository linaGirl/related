(function() {
    'use strict';

    let log = require('ee-log');
    let QueryBuilder = require('./QueryBuilder');





    /**
     * dynamically builds a query builder for an entitiy
     *
     * @param {object} the entities definition
     *
     * @returns {function} the query builders constructor
     */
    module.exports = function(options) {


        /**
         * the actual query builder for the entitiy
         */
        class QueryBuilderInstance extends QueryBuilder {


            /**
             * stets the class up
             *
             */
            constructor(parameters) {
                super(parameters);
            }
        }





        // add the definition to the query builder
        QueryBuilderInstance.prototype.definition = options.definition;

        // add the database to the query builder
        QueryBuilderInstance.prototype.database = options.database;

        // publish the query builders name
        QueryBuilderInstance.prototype.name = options.definition.getAliasName();





        // return the generated query builder
        return QueryBuilderInstance;
    };
})();
