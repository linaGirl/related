(function() {
    'use strict';


    let log                     = require('ee-log');
    let type                    = require('ee-types');
    let QueryBuilderInstance    = require('./QueryBuilderInstance');
    let ModelInstance           = require('./ModelInstance');





    /**
     * dynamically builds the entity class
     */
    module.exports = function(options) {



        // storage that holds the constructors for
        // the model and the query builder, creates
        // them on demand. this must be availabel 
        // to entitiy instances as well its static
        // methods
        let constructorStorage = {

            // retuns the constructor for the model
            get Model() {
                if (!this.ModelConstructor) {
                    this.ModelConstructor = new ModelInstance({
                          database    : options.database
                        , definition  : options.definition
                        , UserModel   : options.UserModel
                    });
                }

                return this.ModelConstructor;
            }



            // retuns the constructor for the uery builder
            , get QueryBuilder() {
                if (!this.QueryBuilderConstructor) {
                    this.QueryBuilderConstructor = new QueryBuilderInstance({
                          database    : options.database
                        , definition  : options.definition
                    });
                }

                return this.QueryBuilderConstructor;
            }
        };







        /**
         * a classic js class, the user can instantiate it 
         * with and without the new keyword. depending on that 
         * a model or a query builder instance is returned
         */
        function EntityInstance(...parameters) {

            // check if the cla
            if (this instanceof EntityInstance) {

                // validate args
                if (parameters.length > 1) throw new Error(`When instantiating the '${this.definition.getAliasName()}' model, an object, a map or nothing can passed to the constructor, got too many arguments!`);
                else {


                    // called with the new keyword
                    // return a new model instance
                    return new constructorStorage.Model(parameters[0]);
                }
            }
            else {

                // return a query builder instance
                return new constructorStorage.QueryBuilder({
                    parameters: parameters
                });
            }
        }







        /**
         * let the database get the constructor of the model
         *
         * @returns {function} model contructor
         */
        EntityInstance.getModelContructor = function getModelContructor() {
            return constructorStorage.Model;
        };


        /**
         * let the database get the constructor of the query builder
         *
         * @returns {function} query builder contructor
         */
        EntityInstance.getQueryBuilderContructor = function getQueryBuilderContructor() {
            return constructorStorage.QueryBuilder;
        };


        


        // return the classs constructor
        return EntityInstance;
    };
})();
