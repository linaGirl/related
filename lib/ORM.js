(function() {
    'use strict';

    var   Class            = require('ee-class')
        , log              = require('ee-log')
        , type             = require('ee-types')
        , EventEmitter     = require('ee-event-emitter')
        , argv             = require('ee-argv')
        , DBCluster        = require('related-db-cluster')
        , QueryContext     = require('related-query-context')
        , Migration        = require('./Migration')
        , Database         = require('./Database')
        , StaticORM        = require('./StaticORM')
        , Set              = require('./Set')
        , ExtensionManager = require('./ExtensionManager')
        , ModelDefinition  = require('./ModelDefinition')
        , debug            = argv.has('debug-sql')
        , dev              = argv.has('dev-orm')
        , asyncMethod      = require('async-method')
        , Selector         = require('./Selector')
        , ORM;



    // we need a single instance of the selector classs
    var selector = new Selector();



    ORM = new Class({
        inherits: EventEmitter

        // indicates if the orm was loaded
        , _loaded: false

        // indicates that the laoding process has started
        , _loading: false

        // grant the orm acces to the static
        // selector collection
        , _selector: selector


        // driver names
        , _driverNames: {
              postgres  : 'related-postgres-connection'
            , mysql     : 'related-mysql-connection'
        }


        /*
         * class constructor, initialize everything
         */
        , init: function(options, pass, host, db, dbName, rdbmsType) {
            var opts;

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
            Class.define(this, '_databases', Class({}));

            // hosts without loaded db
            Class.define(this, '_noDB', Class([]));

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
            return Promise.all(Object.keys(this._databases).map((databaseName) => {
                delete this[databaseName];
                return this._databases[databaseName].end();
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
         * the load method is mainly used when working with promises
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
                    this._initializeOrm(function(err) {
                        this._loaded = true;
                        this._loading = false;
                        this.emit('load', err);
                        callback(err, this);
                    }.bind(this));
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




        /*
         * initializtes the orm, reads the db definition, checks if for relations
         * and their names
         */
        , _initializeOrm: function(callback) {
            if (dev) log.debug('initializing ORM ...');

            // inidcate that we're busy loading the db
            this._loading = true;


            Promise.all(this._dbs.map((db) => {


                // remove old instances
                if (this[db.databaseName] && this[db.databaseName].createTransaction) {
                    if (dev) log.debug('removing existing db instance «'+db.databaseName+'»...');
                    delete this[db.databaseName];
                }

                // get the up to date defintion
                return this._databases[db.databaseName].describe([db.databaseName]).then((databases) => {
                    if (dev) log.debug('got db definition for «'+db.databaseName+'»...');

                    return Promise.resolve({db: db, definition: databases[db.databaseName]});
                }).then((data) => {
                    let db = data.db;
                    let definition = data.definition;


                    // load now
                    var newDefinition = {};

                    if (this[db.databaseName]) return Promise.reject(new Error('Failed to load ORM for database «'+db.databaseName+'», the name is reserved for the orm.'));
                    else if (definition.schemaExists()) {
                        // build the model definitions from the raw definitions
                        Object.keys(definition).forEach(function(modelName) {
                            newDefinition[modelName] = new ModelDefinition(definition[modelName]);
                        }.bind(this));

                        // create names for mapping / reference accessor, handle duplicates
                        this._manageAccessorNames(newDefinition, db);

                        if (dev) log.debug('creating new db instance for «'+db.databaseName+'»...');

                        this[db.alias || db.databaseName] = new Database({
                              orm:          this
                            , definition:   newDefinition
                            , database:     this._databases[db.databaseName]
                            , timeouts:     db.config.timeouts
                            , databaseName: db.databaseName
                            , extensions:   this._extensions
                        });

                        return new Promise((resolve, reject) => {
                            this[db.alias || db.databaseName].on('load', (err, result) => {
                                if (err) reject(err);
                                else resolve();
                            });
                        });                    
                    }
                    else return Promise.resolve();
                });
            })).then(() => {
                if (dev) log.warn('all dbs loaded ...');

                callback();
            }).catch(callback);
        }







        /*
         * checks if there are names that are used twice, if so it
         * disables them for direct access
         */
        , _manageAccessorNames: function(definition, db) {
            var   timestamps    = db.config.timestamps || {}
                , nestedSet     = db.config.nestedSet || {};

            Object.keys(definition).forEach(function(tablename){
                var   model         = definition[tablename]
                    , usedNames     = {}
                    , isNestedSet   = 0;


                model.belongsTo = {};
                model.references = {};


                Object.keys(model.columns).forEach(function(columnName){
                    var   column = model.columns[columnName]
                        , name;

                    if (column.mapsTo) {
                        column.mapsTo.forEach(function(mapping){
                            name = mapping.name;

                            if (name !== model.name) {
                                if (model.columns[name]) {
                                    // the name is used by a column, cannot reference directly
                                    if (debug) log.warn('«'+model.name+'» cannot use the accessor «'+name+'», it\'s already used by another property');
                                    mapping.useGenericAccessor = true;
                                }
                                else if (usedNames[name]) {
                                    // the name was used before by either a mapping or a reference
                                    // we cannot use it
                                    if (debug) log.warn('«'+model.name+'» cannot use the accessor «'+name+'», it\'s already used by another property');
                                    usedNames[name].useGenericAccessor = true;
                                    mapping.useGenericAccessor = true;
                                }
                                else usedNames[name] = mapping;
                            }
                        }.bind(this));
                    }
                    if (column.belongsTo) {
                        column.belongsTo.forEach(function(beloning){
                            name = beloning.name;

                            if (model.columns[name]) {
                                if (debug) log.warn('«'+model.name+'» cannot use the accessor «'+name+'», it\'s already used by another property');
                                // the name is used by a column, cannot reference directly
                                beloning.useGenericAccessor = true;
                            }
                            else if (usedNames[name]) {
                                if (debug) log.warn('«'+model.name+'» cannot use the accessor «'+name+'», it\'s already used by another property');
                                // the name was used before by either a mapping or a reference
                                // we cannot use it
                                usedNames[name].useGenericAccessor = true;
                                beloning.useGenericAccessor = true;
                            }
                            else {
                                usedNames[name] = beloning;
                                model.belongsTo[name] = beloning;
                            }
                        }.bind(this));
                    }
                    if (column.referencedModel && column.referencedModel.name !== model.name) {
                        name = column.referencedModel.name;

                        if (model.columns[name]) {
                            if (debug) log.warn('«'+model.name+'» cannot use the accessor «'+name+'», it\'s already used by another property');
                            // the name is used by a column, cannot reference directly
                            column.useGenericAccessor = true;
                        }
                        else if (usedNames[name]) {
                            if (debug) log.warn('«'+model.name+'» cannot use the accessor «'+name+'», it\'s already used by another property');
                            // the name was used before by either a mapping or a reference
                            // we cannot use it
                            usedNames[name].useGenericAccessor = true;
                            column.useGenericAccessor = true;
                        }
                        else {
                            usedNames[name] = column;
                            model.references[name] = column.referencedModel;
                        }
                    }
                }.bind(this));

                // did we find a nested set on the model?
                if (isNestedSet === 2) {
                    Class.define(model, 'isNestedSet', Class(true).Enumerable());
                    Class.define(model, 'nestedSetLeft', Class(nestedSet.left).Enumerable());
                    Class.define(model, 'nestedSetRight', Class(nestedSet.right).Enumerable());
                }
            }.bind(this));
        }


        /*
         * returns the orm databse object
         */
        , getDatabase: function(id){
            if (!type.string(id) || !id.length) throw new Error('cannot return a db without knowing which on to return (argument 0 must be the db id!)');
            return this._databases[id];
        }


        /*
         * yeah, this one is required
         */
        , doItAll: function() {
            log.wtf('hui');
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
                        this._databases[config.schema] = this._getDBClusterInstance(config);
                    }
                }.bind(this));
            }
            else if (type.object(options)) {
                if (type.array(options.hosts)) {
                    const databaseName = options.schema || options.database;

                    this._dbs.push({
                          databaseName  : databaseName
                        , config        : options
                    });

                    // load db cluster
                    this._databases[databaseName] = this._getDBClusterInstance(options);
                }
                else {
                    Object.keys(options).forEach(function(databaseName){
                        if (!type.string(options[databaseName].type)) throw new Error('['+databaseName+'] > Database type not in config specified (type: \'mysql\' / \'postgres\')!');
                        if (!type.array(options[databaseName].hosts) || !options[databaseName].hosts.length) throw new Error('['+databaseName+'] > Please add at least one host per db in the config!');

                        this._dbs.push({
                              databaseName  : databaseName
                            , config        : options[databaseName]
                        });

                        // load db cluster
                        this._databases[databaseName] = this._getDBClusterInstance(options[databaseName]);
                    }.bind(this));
                }
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
