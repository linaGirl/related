(function() {
    'use strict';

    let log = require('ee-log');
    let ModelSet = require('./ModelSet');





    /**
     * dynamically builds a model for an entitiy
     *
     * @param {object} the entities definition
     *
     * @returns {function} the models constructor
     */
    module.exports = function(options) {


        /**
         * the actual model for the entitiy
         */
        class ModelSetInstance extends ModelSet {





            /**
             * stets the class up
             *
             */
            constructor() {
                super();
            }
        }





        // add the definition to the model
        ModelSetInstance.prototype.definition = options.definition;

        // add the database to the model
        ModelSetInstance.prototype.database = options.database;

        // add the kind to the model
        ModelSetInstance.prototype.kind = options.kind;



        // return the generated model
        return ModelSetInstance;
    };



})();
