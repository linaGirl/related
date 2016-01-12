(function() {
    'use strict';


    let type            = require('ee-types');
    let log             = require('ee-log');
    let Cluster         = require('related-db-cluster');


    let Config          = require('./Config');
    let Entity          = require('./Entity');
    let Transaction     = require('./Transaction');
    let DatabaseProxy   = require('./DatabaseProxy');






    // status codes used to describe the 
    // status of the database
    let statusCodes = new Map();

    statusCodes.set('uninitialized', 100);
    statusCodes.set('loading', 200);
    statusCodes.set('reloading', 250);
    statusCodes.set('ready', 300);
    statusCodes.set('ending', 400);
    statusCodes.set('ended', 500);
    statusCodes.set('errored', 600);







    class Database {


        /**
         * set up the related orm
         *
         * @param {object} options options object
         */
        constructor(options) {

            // storage for the constructors of all entities
            this.entities = new Map();

            // a set continaing the names of all entities, 
            // this is required since the entities itself
            // are created on demand
            this.avialableEntities = new Set();


            // storage for the custom models provided
            // by the user
            this.userModels = new Map();




            // the user may pass mock objects to the db
            if (options) {

                // check for an alternative db cluster implementations
                if (options.Cluster) this.Cluster = options.Cluster;
                if (options.clusterInstance) this.cluster = options.clusterInstance;
            }


            // store the local proxy, so we can it
            // return it later
            this.proxy = new Proxy(this, DatabaseProxy);

            return this.proxy;
        }








        /**
         * returns if there is an entity registered for a given name
         *
         * @param {string} propertyName
         *
         * @returns {boolean}
         */
        has (propertyName) {
            return this.avialableEntities.has(propertyName);
        }







       
        /**
         * returns an entitiy, creates it if required
         *
         * @param {string} propertyName
         *
         * @returns {function} constructor
         */
        get (propertyName) {
            if (this.status === this.statusCodes.get('ready')) {
                if (this.has(propertyName)) {
                    if (!this.entities.has(propertyName)) {

                        // generate the entities constructor
                        this.entities.set(propertyName, new Entity({
                              database   : this
                            , definition : this.definition.getEntity(propertyName)
                            , UserModel  : this.userModels.get(propertyName)
                        }));
                    }
                    return this.entities.get(propertyName);
                }
                else throw new Error(`Cannot return the entity '${propertyName}', the entity does not exist!`);
            }
            else throw new Error(`Cannot return the entity '${propertyName}', the ORM is currently not ready!`);
        }








       
        /**
         * lets the user set a custom model class
         *
         * @param {string} propertyName
         *
         * @returns {function} constructor
         */
        set (propertyName, UserModel) {
            if (this.has(propertyName)) {
                
                // reset the constructor
                if (this.entities.has(propertyName)) this.entities.delete(propertyName);

                // add to storage
                this.userModels.set(propertyName, UserModel);
            }
            else throw new Error(`Cannot return the entity '${propertyName}', the entity does not exist!`);
        }













        /**
         * initialize the database
         *
         * @param {object} userConfig the db config
         *
         * @returns {promise}
         */
        load (userConfig) {
            if (this.status === this.statusCodes.get('uninitialized')) return this.reload(userConfig);
            else throw new Error(`Cannot load, the ORM was loaded already!`);
        }













        /**
         * reloads the database definition and rebuilds the models
         *
         * @param {object} userConfig the user provided config
         *
         * @returns {promise}         
         */
        reload (userConfig) {
            if (this.status > this.statusCodes.get('ready')) return Promise.reject(new Error(`Cannot reload the ORM, it has been ended befroe!`));
            else if (this.status < this.statusCodes.get('ready') && this.status > this.statusCodes.get('uninitialized')) return Promise.reject(new Error(`Cannot reload the ORM, it is currently beeing reloaded!`));
            else {

                // set the appropriate laoding status
                if (this.status === this.statusCodes.get('uninitialized')) this.status = this.statusCodes.get('loading');
                else this.status = this.statusCodes.get('reloading');


                // get the db cluster. either the existing cluster
                // or a new, if a new config is prvided will be used
                return this.getCluster(userConfig, this.statusCodes.get('ready')).then(() => {
                    let schemaName = this.cluster.config.getSchemaName();


                    // get the dbs definition
                    return this.cluster.describe([schemaName]).then((definition) => {

                        // check if we got the requested definition
                        if (!definition.has(schemaName)) return Promise.reject(new Error(`Failed to load the definition for the schema '${schemaName}'!`));
                        else {

                            // store the definition
                            this.definition = definition.get(schemaName);


                            // register the entities
                            this.avialableEntities = new Set();
                            for (let entityName of this.definition.entities.keys()) this.avialableEntities.add(entityName);


                            // empty the entity cosntructor map
                            this.entities = new Map();


                            // set status
                            this.status = this.statusCodes.get('ready');


                            // set up the models & querybuilder
                            return Promise.resolve(this.proxy);
                        }
                    });
                }).catch((err) => {
                    this.status = this.statusCodes.get('errored');

                    return Promise.reject(err);
                });
            }
        }














        /**
         * returns the db cluster if already loaded, creates a new one
         * if a new config is provided
         *
         * @param {object} config the configuration for the cluster
         *
         * @returns {promise} RelatedDBCluster
         */
        getCluster (userConfig) {
            if (this.cluster && !userConfig) return Promise.resolve(this.cluster);
            else {

                // load the new config
                if (userConfig) this.config = new Config(userConfig);


                // create cluster instance, either from a user
                // provided cluster impleentation or our default
                if (this.Cluster) this.cluster = new this.Cluster();
                else this.cluster = new Cluster();


                // start cluster, return to user
                return this.cluster.load(this.config);
            }
        }





        







        /**
         * returns the constructor for a specific model
         *
         * @param {string} modelName
         *
         * @returns {function} constructor
         */
        getModelContructor (modelName) {
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
        getQueryBuilderContructor (queryBuilderName) {
            let entity = this.get(queryBuilderName);

            if (entity) return entity.getQueryBuilderContructor();
            else throw new Error(`Cannot return Query Builder Constructor for the '${queryBuilderName}' entity. The entity does not exist!`);
        }









        pool (options) {
            return Object.create(this, {
                pool: {value: options.pool}
            });
        }







        /**
         * create a new transaction
         *
          * @param {string} poolName
         *
         * @returns {promise} transaction
         */
        createTransaction (poolName) {
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
         * returns the database withtout the proxy
         * only used for testing!
         *
         * @returns {object} this
         */
        getUnproxiedDatabaseInstance() {
            return this;
        }
    }








    // the default status
    Database.prototype.status = statusCodes.get('uninitialized');

    // expose the statuscodes
    Database.prototype.statusCodes = statusCodes;








    // export
    module.exports = Database;
})();
