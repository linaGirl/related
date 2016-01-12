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

        let classDefinition;

        
        // the user may provide a custom class implementation
        if (options.UserModel) {
            classDefinition = class ModelInstance extends options.UserModel {};
        }
        else {
            classDefinition = class ModelInstance extends Model {};
        }
        


        


        // information about the model public properties
        let properties = new Map();
        options.definition.usedNames.forEach((value, key) => properties.set(key, {kind:value}));
        classDefinition.prototype.$properties = properties;




        // add the definition to the model
        classDefinition.prototype.definition = options.definition;

        // add the database to the models
        classDefinition.prototype.database = options.database;

        // publish the models name
        classDefinition.prototype.name = options.definition.getAliasName();




        // the model creates mapping and refernceBy 
        // sets on the fly as they are needed. since 
        // those sets are custom classes they need to
        // be generated on first use. The generated
        // classes will be cached using the storage
        // defoned below
        classDefinition.prototype.mappingConstructors = new Map();
        classDefinition.prototype.belongsToConstructors = new Map();



        // return the generated model
        return classDefinition;
    };



})();
