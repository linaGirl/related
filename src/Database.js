(function() {
    'use strict';


    let Class       = require('ee-class');
    let type        = require('ee-types');
    let log         = require('ee-log');
    let Cluster     = require('related-db-cluster')


    let Config      = require('./Config');
    let Entity      = require('./Entity');
    let Transaction = require('./Transaction');






    module.exports = new Class({

        // the config provided by teh user
          $config: null

        // the database cluster
        , $cluster: null

        // the dbs definition
        , $definition: null
        
        // entity map
        , $entities: null


        // flags
        , loaded: false
        , loading: false








        /**
         * set up the related orm
         *
         * @param {object} options options object
         */
        , init: function(options) {

            if (options) {

                // check for an alternative db cluster implementations
                if (options.Cluster) Class.define(this, '$Cluster', Class(options.Cluster));
                if (options.clusterInstance) Class.define(this, '$cluster', Class(options.clusterInstance));
            }
        }












        /**
         * initialize the database
         *
         * @param {object} userConfig the db config
         *
         * @returns {promise}
         */
        , load: function(userConfig) {

            // store the config
            Class.define(this, '$config', Class(new Config(userConfig)));


            // first load the db cluster 
            // for this db
            return this.getCluster(this.$config).then((cluster) => {


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
        , reload: function() {
            let schemaName = this.$config.getSchemaName();



            // entity list
            Class.define(this, '$entities', Class(new Map()).Writable());



            // get the up to date definition from the cluster
            return this.$cluster.describe([schemaName]).then((definition) => {

                // check if we got the requested definition
                if (!definition.has(schemaName)) return Promise.reject(new Error(`Failed to load the definition for the schema '${schemaName}'!`));
                else {

                    // store the definition
                    Class.define(this, '$definition', Class(definition.get(schemaName)).Writable());

                    // set up the models & querybuilder
                    return this.initialize();
                }
            }).then(() => {

                // return this to the user
                return Promise.resolve(this);
            })
        }













        /**
         * set up the query builders and entities
         *
         * @returns {promise}
         */
        , initialize: function() {

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
        , getCluster: function(config) {
            if (this.$cluster) return Promise.resolve(this.$cluster);
            else {

                // create cluster instance, either 
                // from a user provided cluster impleentation
                // or our default
                let cluster = new (this.$Cluster || Cluster)();


                // store the cluster
                Class.define(this, '$cluster', Class(cluster).Writable());


                // start cluster, return to user
                return cluster.load(config);
            }
        }



        









        /**
         * create a new transaction
         *
         * @param {string} poolName
         *
         * @returns {promise} transaction
         */
        , createTransaction: function(poolName) {
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
        , get: function(entityName) {
            return this.$entities.has(entityName) ? this.$entities.get(entityName) : null;
        }
    });
})();
