(function() {
    'use strict';

    let log = require('ee-log');
    let Model = require('./Model');





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
        class ModelInstance extends Model {


            /**
             * stets the class up
             *
             */
            constructor(values) {
                super(values);
            }
        }





        // information about the model public properties
        let properties = new Map();
        options.definition.usedNames.forEach((value, key) => properties.set(key, {kind:value}));
        ModelInstance.prototype.$properties = properties;




        // add the definition to the model
        ModelInstance.prototype.definition = options.definition;

        // add the database to the models
        ModelInstance.prototype.database = options.database;

        // publish the models name
        ModelInstance.prototype.name = options.definition.getAliasName();




        // the model creates mapping and refernceBy 
        // sets on the fly as they are needed. since 
        // those sets are custom classes they need to
        // be generated on first use. The generated
        // classes will be cached using the storage
        // defoned below
        ModelInstance.prototype.mappingConstructors = new Map();
        ModelInstance.prototype.belongsToConstructors = new Map();



        // return the generated model
        return ModelInstance;
    };



})();
