(function() {
    'use strict';


    let Class       = require('ee-class');
    let type        = require('ee-types');
    let log         = require('ee-log');


    let Model       = require('./Model');





    module.exports = new Class({


        /**
         * set up the related orm
         */
        init: function(options) {

            // store the definition, the usermodel, the database
            Class.define(this, 'database', Class(options.database));
            Class.define(this, 'definition', Class(options.definition));
            Class.define(this, 'UserModel', Class(options.UserModel));


                
            // lets create the model
            return this.generate();
        }









        /**
         * generates the model specicif class. 
         */
        , generate: function() {
            let ClassDefinition = {};


            // give the model acces to its database
            ClassDefinition.$database = Class(this.database);

            // give the model acces to its definition
            ClassDefinition.$definition = Class(this.definition);



            // check if we need to extend 
            // from the user provided Model
            if (this.UserModel) ClassDefinition.inherits = this.UserModel;
            else ClassDefinition.inherits = Model;


            // storage for class wide events
            ClassDefinition.$listeners = new Map();



            // initialize the model
            ClassDefinition.init = function() {

                // storage for the values from the db
                Class.define(this, '$values', Class(new Map()));

                // the model needs to know which columns where
                // loaded from the db, else it cannot know
                // which columns have changed values
                Class.define(this, '$selectedColumns', Class(new Set()));


                // contains a not complete set
                // of dirty columns, strictly for 
                // internal usee only
                Class.define(this, '$dirtyValues', Class(new Set()));


                
            }


            return new Class(ClassDefinition);
        }

    });
})();
