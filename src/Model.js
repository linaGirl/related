(function() {
    'use strict';


    let Class               = require('ee-class');
    let type                = require('ee-types');
    let log                 = require('ee-log');


    let ModelBase           = require('./ModelBase');
    let ModelSet            = require('./ModelSet');





    /**
     * dynamically builds a model for the current 
     * entitiy. The model inherits either from the
     * ModelBase class or the UserModel that in turn
     * inherits from the ModelBase
     */




    module.exports = function(options) {
        let definition = options.definition;


        let Model = {

            // give the model acces to its database
              $database: Class(options.database)

            // give the model acces to its definition
            , $definition: Class(definition)

            // storage for class wide events
            , $listeners: new Map()






            /**
             * set up the model, create instance storage
             * 
             */
            , init: function init() {

                // storage for the values from the db
                Class.define(this, '$values', Class(new Map()));

                // map for knowing which refernces have changed
                Class.define(this, '$references', Class(new Map()));

                // the model needs to know which columns where
                // loaded from the db, else it cannot know
                // which columns have changed values
                Class.define(this, '$selectedColumns', Class(new Set()));


                // contains a not complete set
                // of dirty columns, strictly for 
                // internal usee only
                Class.define(this, '$dirtyValues', Class(new Set()));


                // call the super constructor
                init.super.call(this);
            }
        };



        // set up the getters for the mappings
        // the sets are created on demand in order
        // to use less resources
        definition.mappings.forEach((mappingDefinition, mappingName) => {
            Model[mappingName] = {
                get: function() {
                    if (!this.$mappings) this.$mappings = new Map();
                    if (!this.$mappings.has(mappingName)) this.$mappings.set(mappingName, new ModelSet());

                    return this.$mappings.get(mappingName);
                }
            };
        });


        // do the same for the referenced by entities 
        // (aka belongs to)
        definition.referenceBys.forEach((referencedByDefinition, referencedByName) => {
            Model[referencedByName] = {
                get: function() {
                    if (!this.$referencedBy) this.$referencedBy = new Map();
                    if (!this.$referencedBy.has(referencedByName)) this.$referencedBy.set(referencedByName, new ModelSet());

                    return this.$referencedBy.get(referencedByName);
                }
            };
        });







        // check if we need to extend 
        // from the user provided Model
        if (options.UserModel) Model.inherits = options.UserModel;
        else Model.inherits = ModelBase;



        // return customized class
        return new Class(Model);
    };
})();
