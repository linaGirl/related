(function() {
    'use strict';


    let Class       = require('ee-class');
    let type        = require('ee-types');
    let log         = require('ee-log');
    let Cluster     = require('related-db-cluster');


    let Config      = require('./Config');
    let Entity      = require('./Entity');
    let Transaction = require('./Transaction');



    class Database {


        /**
         * set up the related orm
         *
         * @param {object} options options object
         */
        constructor(options) {

            if (options) {

                // check for an alternative db cluster implementations
                if (options.Cluster) Object.defineProperty(this, '$Cluster', {value: options.Cluster});
                if (options.clusterInstance) Object.defineProperty(this, '$cluster', {value: options.clusterInstance});
            }
        }












        /**
         * initialize the database
         *
         * @param {object} userConfig the db config
         *
         * @returns {promise}
         */
        load(userConfig) {

            // store the config
            Object.defineProperty(this, '$config', {value: new Config(userConfig)});


            // first load the db cluster 
            // for this db
            return this.getCluster(this.$config).then(() => {


                // load the databse definition
                // and rebuild themodels
                return this.reload();
            });
        }













        /**
         * reloads the database definition and rebuilds the models
         *
         * @returns {promise}         
         */
        reload() {
            let schemaName = this.$config.getSchemaName();



            // entity list
            Object.defineProperty(this, '$entities', {
                  value: new Map()
                , writable: true
            });



            // get the up to date definition from the cluster
            return this.$cluster.describe([schemaName]).then((definition) => {

                // check if we got the requested definition
                if (!definition.has(schemaName)) return Promise.reject(new Error(`Failed to load the definition for the schema '${schemaName}'!`));
                else {

                    // store the definition
                    Object.defineProperty(this, '$definition', {
                          value: definition.get(schemaName)
                        , writable: true
                    });

                    // set up the models & querybuilder
                    return this.initialize();
                }
            }).then(() => {

                // return this to the user
                return Promise.resolve(this);
            });
        }













        /**
         * set up the query builders and entities
         *
         * @returns {promise}
         */
        initialize() {

            // iterate over all entities
            for (let entityDefinition of this.$definition.entities.values()) {
                let entityName = entityDefinition.getAliasName();

                let entity = new Entity({
                      definition    : entityDefinition
                    , database      : this
                });

                // store
                this.$entities.set(entityName, entity);

                // check if there is space 
                // for qucick access
                if (type.undefined(this[entityName])) this[entityName] = entity;
            }


            return Promise.resolve();
        }













        /**
         * returns a cluster, creates a new if it
         * not already exists
         *
         * @param {object} config the configuration for the cluster
         *
         * @returns {promise} RelatedDBCluster
         */
        getCluster(config) {
            if (this.$cluster) return Promise.resolve(this.$cluster);
            else {

                // create cluster instance, either 
                // from a user provided cluster impleentation
                // or our default
                let cluster;
                if (this.$Cluster) cluster = new this.$Cluster();
                else cluster = new Cluster();


                // store the cluster
                Object.defineProperty(this, '$cluster', {
                      value: cluster
                    , writable: true
                });


                // start cluster, return to user
                return cluster.load(config);
            }
        }





        




        /**
         * returns the constructor for a specific model
         *
         * @param {string} modelName
         *
         * @returns {function} constructor
         */
        getModelContructor(modelName) {
            let entity = this.get(modelName);

            if (entity) return entity.getModelContructor();
            else throw new Error(`Cannot return Model Constructor for the '${modelName}' entity. The entity does not exist!`);
        }





        




        /**
         * returns the constructor for a specific query builder
         *
         * @param {string} queryBuilderName
         *
         * @returns {function} constructor
         */
        getQueryBuilderContructor(queryBuilderName) {
            let entity = this.get(queryBuilderName);

            if (entity) return entity.getQueryBuilderContructor();
            else throw new Error(`Cannot return Query Builder Constructor for the '${queryBuilderName}' entity. The entity does not exist!`);
        }














        /**
         * create a new transaction
         *
          * @param {string} poolName
         *
         * @returns {promise} transaction
         */
        createTransaction(poolName) {
            if (!this.$cluster) return Promise.reject(new Error('Cannot create transaction, the cluster is not initialized!'));
            else {

                // get conenction
                return this.$cluster.getConnection(poolName).then((connection) => {

                    // create transaction
                    return connection.createTransaction().then(() => {
                        
                        // nice, return
                        return Promise.resolve(new Transaction(this, connection));
                    });
                });
            }
        }







        /**
         * returns an entity
         *
         * @param {string} entityName the name of the entitiy
         */
        get(entityName) {
            return this.$entities.has(entityName) ? this.$entities.get(entityName) : null;
        } 
    }



    // flags
    Database.prototype.loaded = false;
    Database.prototype.loading = false;


    // export
    module.exports = Database;
})();
