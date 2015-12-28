(function() {
    'use strict';


    let Class       = require('ee-class');
    let type        = require('ee-types');
    let log         = require('ee-log');


    let QueryBuilderGenerator = require('./QueryBuilderGenerator');
    let ModelGenerator = require('./ModelGenerator');



    

    module.exports = new Class({



        /**
         * set up the related orm
         */
        init: function(options) {

            // store db reference and definition
            Class.define(this, 'database', Class(options.database));
            Class.define(this, 'definition', Class(options.definition));


            // dynamically create the model && querybuilder
            let Model = this.createModel();
            let QueryBuilder = this.createQueryBuilder();



            // create the constructor that is beeing returneed
            let Constructor = function() {

                // create an array from the arguments
                // wish i could use rest paramters :/
                let args = [];
                for (let i = 0, l = arguments.length; i <l; i++) args.push(arguments[i]);

                // check what has to be returned 
                if (this instanceof Constructor) {


                    // called with the new keyword
                    // return a new model instance
                    return new Model({
                        args: args
                    });
                }
                else {


                    // return a query builder instance
                    return new QueryBuilder({
                        args: args
                    });
                }
            };


            return Constructor;
        }







        , defineReferenceName: function(localColumn, name) {

        }




        , defineMappingName: function(mappingEntity, name) {

        }




        , defineReferecedByName: function(foreignColumn, name) {

        }





        , use: function(UserModel) {
            this.UserModel = UserModel;
        }







        /**
         * builds the querybuilder instance 
         * for this entity
         *
         * @returns {constructor}
         */
        , createQueryBuilder: function() {
            return new QueryBuilderGenerator({
                  database    : this.database
                , definition : this.definition
            });
        }





        /**
         * builds the model instance 
         * for this entity
         *
         * @returns {constructor}
         */
        , createModel: function() {
            return new ModelGenerator({
                  database    : this.database
                , definition : this.definition
                , UserModel   : this.UserModel
            });
        }
    });
})();
