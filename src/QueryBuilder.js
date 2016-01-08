(function() {
    'use strict';


    let type                = require('ee-types');
    let log                 = require('ee-log');





    /**
     * storage for the names pf all public methods
     * that should be retuned by the proxy
     *
     * the list can be extended by calling 
     * Model.addPublicMethod(propertyName);
     */
    let publicMethods = new Set([
          'find'
        , 'findOne'
        , 'limit'
    ]);






        
    // the basic model definition
    class QueryBuilder {




        /**
         * static method for adding another
         * public method that should be exposed to
         * the user
         *
         * @param {string} propertyName
         */
        static addPublicMethod(propertyName) {
            publicMethods.add(propertyName);
        }




        find() {
            return Promise.resolve();
        }




        /**
         * stets the class up
         */
        constructor(parameters) {



        }
    }







    // export
    module.exports = QueryBuilder;

})();
