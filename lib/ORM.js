(function() {
    'use strict';

    let Class            = require('ee-class');
    let log              = require('ee-log');
    let type             = require('ee-types');
    let EventEmitter     = require('ee-event-emitter');
    let argv             = require('ee-argv');
    let asyncMethod      = require('async-method');
    let DBCluster        = require('related-db-cluster');
    let QueryContext     = require('related-query-context');


    let Migration        = require('./Migration');
    let DatabaseModel    = require('./DatabaseModel');
    let StaticORM        = require('./StaticORM');
    let Set              = require('./Set');
    let ExtensionManager = require('./ExtensionManager');
    let ModelDefinition  = require('./ModelDefinition');
    let Selector         = require('./Selector');


    let debug            = argv.has('debug-sql');
    let dev              = argv.has('dev-orm');





    // we need a single instance of the selector classs
    // why you stupid fuck?
    let selector = new Selector();







    let ORM = new Class({
        inherits: EventEmitter

        // indicates if the orm was loaded
        , _loaded: false

        // indicates that the laoding process has started
        , _loading: false

        // grant the orm access to the static
        // selector collection
        , _selector: selector







        /*
         * class constructor, initialize everything
         */
        , init: function(options, pass, host, db, dbName, rdbmsType) {
            let opts;

            // the constructor accepts also simple conneciton paramters
            if (type.string(options) && type.string(pass) && type.string(db)) {
                // build options object
                opts = {};
                opts[db] = {};
                opts[db].type = rdbmsType || 'postgres';
                opts[db].hosts = [];
                opts[db].database = dbName;
                opts[db].hosts.push({
                      host      : host || '127.0.0.1'
                    , username  : options
                    , password  : pass
                    , port      : rdbmsType === 'mysql' ? 3306 : 5432
                    , pools     : ['read', 'write']
                });

                options = opts;
            }

            // store my options
            Class.define(this, '_options', Class(options));

            // list of databse defintions
            Class.define(this, '_dbs', Class([]));

            // all loaded extension
            Class.define(this, '_extensions', Class(new ExtensionManager(this)));

            // the actual database connections
            Class.define(this, '_clusters', Class(new Map()));

            // hosts without loaded db
            Class.define(this, '_noDB', Class([]));

            // holds the dbs orm instances
            Class.define(this, '_orms', Class(new Map()));

            // indicators
            Class.define(this, '_loaded', Class(false).Writable());
            Class.define(this, '_loading', Class(false).Writable());

            // let the user create a new schema
            Class.define(this, 'Schema', Class(function(schemaName, callback) {
                return this.createSchema(schemaName, callback);
            }.bind(this)));

            // db connectivity
            this._initializeDatabases(options);
        }






        /**
         * creates a serializable migration object
         *
         * @param <string> version or filename
         */
        , createMigration: function(version) {
            return new Migration(version);
        }







        /**
         * add a new configuration and reload the orm
         *
         * @partm <object> config
         */
        , addConfig: function(config) {
            if (!type.array(config)) config = [config];

            // db connectivity
            this._initializeDatabases(config);

            // reload
            return this.reload(callback);
        }








        /**
         * shuts the orm down, ends all connections
         */
        , end: function() {
            return Promise.all(Object.keys(this._clusters).map((databaseName) => {
                delete this[databaseName];
                return this._clusters[databaseName].end();
            }));
        }








        /**
         * create a new database
         *
         * @param <object> database config or DBCluster instance
         * @param <string> database name
         */
        , createDatabase: function(config, databaseName) {
            config = this._prepareConfig(config);

            config.database = null;
            config.schema = null;

            return this._executeQuery(config, {
                  mode: 'create'
                , database: databaseName
            });
        }







        /**
         * drop a database
         *
         * @param <object> database config or DBCluster instance
         * @param <string> database name
         */
        , dropDatabase: function(config, databaseName) {
            config = this._prepareConfig(config);

            config.database = null;
            config.schema = null;

            return this._executeQuery(config, {
                  mode: 'drop'
                , database: databaseName
            });
        }





        /**
         * create a new schema
         *
         * @param <object> database config or DBCluster instance
         * @param <string> schema name
         */
        , createSchema: function(config, schemaName, databaseName) {
            config = this._prepareConfig(config);

            config.schema = null;
            if (databaseName) config.database = databaseName;


            return this._executeQuery(config, {
                  mode: 'create'
                , schema: schemaName
                , database: databaseName
            });
        }







        /**
         * drop a schema
         *
         * @param <object> database config or DBCluster instance
         * @param <string> schema name
         */
        , dropSchema: function(config, schemaName, databaseName) {
            config = this._prepareConfig(config);

            config.schema = null;
            if (databaseName) config.database = databaseName;

            return this._executeQuery(config, {
                  mode: 'drop'
                , schema: schemaName
                , database: databaseName
            });
        }







        /**
         * executes a qwuery on a specific config
         */
        , _executeQuery: function(config, query) {
            let db = this._getDBClusterInstance(config);

            return db.query(new QueryContext({
                  pool: 'write'
                , query: query
            })).then((result) => {

                // nice, end the db
                return db.end();
            }).catch((err) => {

                // end the db on errors
                return db.end().then(() => {
                    return Promise.reject(err);
                });
            });
        }








        /**
         * instantiartes a db clsuter instance
         *
         * @param <object> config
         */
        , _getDBClusterInstance: function(config) {
            let db = new DBCluster({driver: config.type});

            config = this._prepareConfig(config);

            config.hosts.forEach((hostConfig) => {
                db.addNode(hostConfig);
            });

            return db;
        }





        /**
         * creates a copy of the config object, removes the db and schema
         * entry if the flag is set
         *
         * @param <object> config
         * @param <Boolean> flag if the schema and dtabase property should be omitted
         */
        , _prepareConfig: function(config, excludeDatabase) {
            var copy = {};

            Object.keys(config).forEach(function(key) {
                if (key === 'hosts') {
                    copy.hosts = [];
                    config.hosts.forEach(function(host) {
                        var hostCopy = {};

                        if (config.alias) hostCopy.alias = config.alias;

                        Object.keys(host).forEach(function(hostKey) {
                            hostCopy[hostKey] = host[hostKey];
                        });

                        if (!excludeDatabase) hostCopy.database = config.database || config.schema;

                        copy.hosts.push(hostCopy);
                    });
                }
                else if (!excludeDatabase || (key !== 'schema' && key !== 'database')) {
                    copy[key] = config[key];
                }
            });

            return copy;
        }








        /*
         * accepts extension to the orm
         */
        , use: function(extension) {
            if (extension.isRelatedExtension && extension.isRelatedExtension()) {

                // check for selectors
                if (extension.hasSelectorExtensions()) {
                    extension.getSelectorExtensions().forEach(this._selector.registerExtension.bind(this._selector));
                }

                // extension may use the orm
                extension.setOrm(this);

                // register
                this._extensions.register(extension);
            }
            else {
                // legacy
                // old school extension
                if (!extension || !type.function(extension.isExtension) || !extension.isExtension()) throw new Error('cannot add extion to orm, it doesn\'t register itself as one!');

                // register the extension
                this._extensions.register(extension);
            }

            return this;
        }


        /*
         * return a specific extension
         */
        , getExtension: function(name) {
            return this._extensions.get(name);
        }


        /*
         * indicates if the orm was laoded already
         */
        , isLoaded: function() {
            return !!this._loaded;
        }






        /*
         * initializes the orm
         */
        , load: function(callback) {
            if (callback) {

                // print errors caused by the callback!
                let outerCallback = callback;
                callback = (err, ormObject) => {
                    try {
                        outerCallback(err, ormObject);
                    } catch (e) {
                        log(e);
                    }
                };

                if (this._loaded && !this._loading) callback();
                else if (this._loading) this.once('load', callback);
                else this.reload(callback);
            }
            else {
                return new Promise(function(resolve, reject) {
                    var cb = function(err) {
                        if (err) reject(err);
                        else resolve(this);
                    }.bind(this);

                    if (this._loaded && !this._loading) cb();
                    else if (this._loading) this.once('load', cb);
                    else this.reload(cb);
                }.bind(this));
            }
        }









        /**
         * rebuilds the orm from scratch, basically used
         * for integrating extensions very late
         */
        , reload: asyncMethod(function(callback) {
            if (!this._loading) {
                this._loaded = false;

                process.nextTick(function() {
                    this._initializeOrm().then(() => {
                        this._loaded = true;

                        this.emit('load');
                        callback(null, this);
                    }).catch((err) => {
                        this.emit('load', err);
                        callback(err);
                    });
                }.bind(this));
            }
            else {
                this.once('load', function() {
                    this.relaod(callback);
                }.bind(this));
            }
        })









        /*
         * return the ORM object used to create filters & more
         */
        , getORM: function() {
            return ORM;
        }








        /**
         * returns a db models
         *
         * @param {string} databaseName the name of the db to return
         *
         * @returns {object|null}
         */
        , get: function(databaseName) {
            return this._orms.has(databaseName) ? this._orms.get(databaseName) : null;
        }








        /*
         * initializtes the orm, reads the db definition, checks if for relations
         * and their names
         */
        , _initializeOrm: function() {
            // inidcate that we're busy loading the db
            this._loading = true;


            return Promise.all(this._dbs.map((db) => {
                let databaseName = db.databaseName;

                // remove old instances
                if (this._orms.has(databaseName)) {
                    this._orms.delete(databaseName);
                    if (this[databaseName] && this[databaseName].createTransaction) delete this[databaseName];
                }


                // get the up to date defintion
                return this._clusters.get(databaseName).describe([databaseName]).then((databases) => {
                    let definition = databases.get(databaseName);
                    

                    // don't initialize if the schema 
                    // does not exist
                    if (definition.exists) {


                        // set up the orm for the database
                        let databaseModel = new DatabaseModel({
                              orm:          this
                            , definition:   definition
                            , database:     this._clusters.get(databaseName)
                            , timeouts:     db.config.timeouts
                            , databaseName: databaseName
                            , extensions:   this._extensions
                        });


                        // add quick acces if possible
                        if (!this[definition.getAliasName()]) this[definition.getAliasName()] = databaseModel;


                        return new Promise((resolve, reject) => {
                            databaseModel.on('load', (err, result) => {
                                this._loading = false;

                                if (err) reject(err);
                                else resolve();
                            });
                        });                    
                    }
                    else return Promise.resolve();
                });
            }));
        }














        /*
         * returns the orm databse object
         */
        , getDatabase: function(id) {
            if (!type.string(id) || !id.length) throw new Error('cannot return a db without knowing which on to return (argument 0 must be the db id!)');
            return this._clusters.get(id);
        }











        /*
         * initializes the db clusters, connectors to the database
         */
        , _initializeDatabases: function(options) {
            if (type.array(options)) {
                options.forEach(function(config) {
                    if (!type.string(config.type)) throw new Error('['+config.schema+'] > Database type not in config specified (type: \'mysql\' / \'postgres\')!');
                    if (!type.array(config.hosts) || !config.hosts.length) throw new Error('['+config.schema+'] > Please add at least one host per db in the config!');

                    // check if there is anythin to load
                    // if the user didnt specify a schema nor a database
                    // we should not load one
                    if (!config.schema && !config.database) {
                        config.noDatabase = true;
                        this._noDB.push(new DBCluster({}, this._loadDriver(config.type)));
                    }
                    else {
                        this._dbs.push({
                              databaseName  : config.schema
                            , config        : config
                            , alias         : config.alias
                        });

                        // load db cluster
                        this._clusters.set(config.schema, this._getDBClusterInstance(config));
                    }
                }.bind(this));
            }
            else if (type.object(options)) {
                Object.keys(options).forEach(function(databaseName){
                    if (!type.string(options[databaseName].type)) throw new Error('['+databaseName+'] > Database type not in config specified (type: \'mysql\' / \'postgres\')!');
                    if (!type.array(options[databaseName].hosts) || !options[databaseName].hosts.length) throw new Error('['+databaseName+'] > Please add at least one host per db in the config!');

                    this._dbs.push({
                          databaseName  : databaseName
                        , config        : options[databaseName]
                    });

                    // load db cluster
                    this._clusters.set(databaseName, this._getDBClusterInstance(options[databaseName]));
                }.bind(this));
            }
            //else throw new Error('no database configuration present!');
        }
    });

    





    // set static methods on the ORM constructor
    Class.implement(new StaticORM(), ORM);

    // export the set so extensions can make use of it
    ORM.Set = Set;

    // export the selector interface
    selector.applyTo(ORM);

    // export
    module.exports = ORM;
})();
