!function(){
    'use strict';

    var   Class                 = require('ee-class')
        , log                   = require('ee-log')
        , type                  = require('ee-types')
        , EventEmitter          = require('ee-event-emitter')
        , argv                  = require('ee-argv')
        , async                 = require('ee-async')
        , DBCluster             = require('ee-db-cluster')
        , Migration             = require('./Migration')
        , Database              = require('./Database')
        , StaticORM             = require('./StaticORM')
        , Set                   = require('./Set')
        , ExtensionManager      = require('./ExtensionManager')
        , ModelDefinition       = require('./ModelDefinition')
        , debug                 = argv.has('debug-sql')
        , Promise               = Promise || require('es6-promise').Promise
        , dev                   = argv.has('dev-orm')
        , asyncMethod           = require('async-method')
        , staticORM
        , ORM;



    ORM = new Class({
        inherits: EventEmitter

        // indicates if the orm was loaded
        , _loaded: false

        // indicates that the laoding process has started
        , _loading: false


        // driver names
        , _driverNames: {
              postgres  : 'ee-postgres-connection'
            , mysql     : 'ee-mysql-connection'
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
                    , mode      : 'readwrite'
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
         * @param <function> optional callbac
         */
        , addConfig: asyncMethod(function(config, callback) {
            if (!type.array(config)) config = [config];

            if (!type.function(callback)) throw new Error('Please pass a config to the addConfig method!');

            // db connectivity
            this._initializeDatabases(config);

            // reload
            this.reload(callback);
        })





        /**
         * shuts the orm down, ends all connections
         *
         * @param <function> optional callbac
         */
        , end: asyncMethod(function(callback) {
            Promise.all(Object.keys(this._databases).map(function(databaseName) {
                delete this[databaseName];
                return this._databases[databaseName].end();
            }.bind(this))).then(function() {
                callback();
            }).catch(callback);
        })





        /**
         * create a new database
         * 
         * @param <object> database config or DBCluster instance
         * @param <string> database name
         * @param <function> optional callback, if not passed a promeise is returned
         */
        , createDatabase: asyncMethod(function(config, databaseName, callback) {
            var db = this._getDBClusterInstance(config, true);

            // execute the query
            db.query({
                  mode: 'create'
                , query: {
                    database: databaseName
                }
                , callback: function(err) {
                    db.end(function() {
                        callback(err);
                    }.bind(this));
                }
            })
        })


 

        /**
         * drop a database
         * 
         * @param <object> database config or DBCluster instance
         * @param <string> database name
         * @param <function> optional callback, if not passed a promeise is returned
         */
        , dropDatabase: asyncMethod(function(config, databaseName, callback) {
            var db = this._getDBClusterInstance(config, true);

            // execute the query
            db.query({
                  mode: 'drop'
                , query: {
                    database: databaseName
                }
                , callback: function(err) {
                    db.end(function() {
                        callback(err);
                    }.bind(this));
                }
            })
        })




        /**
         * drop a schema
         * 
         * @param <object> database config or DBCluster instance
         * @param <string> schema name
         * @param <function> optional callback, if not passed a promeise is returned
         */
        , dropSchema: asyncMethod(function(config, schemaName, callback) {
            var db = this._getDBClusterInstance(config);

            // execute the query
            db.query({
                  mode: 'drop'
                , query: {
                    schema: schemaName
                }
                , callback: function(err) {
                    db.end(function() {
                        callback(err);
                    }.bind(this));
                }
            })
        })



        /**
         * create a new schema
         * 
         * @param <object> database config or DBCluster instance
         * @param <string> schema name
         * @param <function> optional callback, if not passed a promeise is returned
         */
        , createSchema: asyncMethod(function(config, schemaName, callback) {
            var db = this._getDBClusterInstance(config);

            // execute the query
            db.query({
                  mode: 'create'
                , query: {
                    schema: schemaName
                }
                , callback: function(err) {
                    db.end(function() {
                        callback(err);
                    }.bind(this));
                }
            })
        })


        
       

        /**
         * instantiartes a db clsuter instance
         *
         * @param <object> config
         * @param <Boolean> flag if the schema and dtabase property should be omitted
         */
        , _getDBClusterInstance: function(config, noDatabase) {
            var db = new DBCluster({}, this._loadDriver(config.type));

            config = this._prepareConfig(config, noDatabase);
            
            config.hosts.forEach(function(hostConfig){
                db.addNode(hostConfig);
            }.bind(this));

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
            if (!extension || !type.function(extension.isExtension) || !extension.isExtension()) throw new Error('cannot add extion to orm, it doesn\'t register itself as one!');
            
            // register the extension
            this._extensions.register(extension);
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
                        if (callback) callback(err, this);
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

            async.each(this._dbs

            // remove existing
            , function(db, next) {
                if (this[db.databaseName] && this[db.databaseName].createTransaction) {
                    if (dev) log.debug('removing existing db instance «'+db.databaseName+'»...');
                    delete this[db.databaseName];
                }

                next(null, db);
            }.bind(this)


            // get definition from database
            , function(db, next) {
                this._databases[db.databaseName].describe([db.databaseName], function(err, databases){
                    if (dev) log.debug('got db definition for «'+db.databaseName+'»...');

                    if (err) next(err);
                    else {
                        // push config to next step
                        next(null, db, databases[db.databaseName]);
                    }
                }.bind(this));
            }.bind(this)


            // initialize orm per databse
            , function(db, definition, next) {
                var newDefinition = {};

                if (this[db.databaseName]) next(new Error('Failed to load ORM for database «'+db.databaseName+'», the name is reserved for the orm.').setName('ORMException'));
                else if (definition.schemaExists()) {
                    // build the model definitions from the raw definitions
                    Object.keys(definition).forEach(function(modelName) {
                        newDefinition[modelName] = new ModelDefinition(definition[modelName]);
                    }.bind(this));

                    // create names for mapping / reference accessor, handle duplicates
                    this._manageAccessorNames(newDefinition, db);

                    if (dev) log.debug('creating new db instance for «'+db.databaseName+'»...');

                    this[db.databaseName] = new Database({
                          orm:          this
                        , definition:   newDefinition
                        , database:     this._databases[db.databaseName]
                        , timeouts:     db.config.timeouts
                        , databaseName: db.databaseName
                        , extensions:   this._extensions
                    });


                    this[db.databaseName].on('load', next);
                }
                else next();
            }.bind(this)


            // check for errors
            , function(err, results){
                 if (dev) log.warn('all dbs loaded ...');

                if (err) callback(err);
                else callback();
            }.bind(this));  
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
                            else usedNames[name] = beloning;
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
                        else usedNames[name] = column;
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
                        });

                        // load db cluster
                        this._databases[config.schema] = this._getDBClusterInstance(config);
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
                    this._databases[databaseName] = this._getDBClusterInstance(options[databaseName]);
                }.bind(this));
            }
            //else throw new Error('no database configuration present!');
        }




        /**
         * load a connection driver by type
         *
         * @param <String> driver type
         */
        , _loadDriver: function(type) {
            var driver;

            if (this._driverNames[type]) {
                try {
                    driver = require(this._driverNames[type]);
                } catch (e) {
                    throw new Error('Failed to load connection driver for type «'+type+'» :'+e);
                }

                return driver;
            }
            else throw new Error('Failed to load connection driver for type «'+type+'» !');
        }
    });


    
    

    // set static methods on the ORM constructor
    Class.implement(new StaticORM(), ORM);
    
    // export the set so extensions can make use of it
    ORM.Set = Set;

    // export
    module.exports = ORM;    
}();
