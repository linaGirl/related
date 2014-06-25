!function(){
    'use strict';

    var   Class             = require('ee-class')
        , log               = require('ee-log')
        , type              = require('ee-types')
        , EventEmitter      = require('ee-event-emitter')
        , argv              = require('ee-argv')
        , async             = require('ee-async')
        , DBCluster         = require('ee-db-cluster')
        , Database          = require('./Database')
        , StaticORM         = require('./StaticORM')
        , Set               = require('./Set')
        , ExtensionManager  = require('./ExtensionManager')
        , ModelDefinition   = require('./ModelDefinition')
        , debug             = argv.has('debug-sql')
        , dev               = argv.has('dev-orm')
        , staticORM
        , ORM;




    ORM = new Class({
        inherits: EventEmitter

        // indicates if the orm was loaded
        , _loaded: false

        // indicates that the laoding process has started
        , _loading: false

        /*
         * class constructor, initialize everything
         */
        , init: function(options) {
            // store my options
            Class.define(this, '_options', Class(options));

            // list of databse defintions
            Class.define(this, '_dbs', Class([]));

            // all loaded extension
            Class.define(this, '_extensions', Class(new ExtensionManager(this)));

            // the actual database connections
            Class.define(this, '_databases', Class({}));

            // indicators
            Class.define(this, '_loaded', Class(false).Writable());
            Class.define(this, '_loading', Class(false).Writable());

            // db connectivity
            this._initializeDatabases(options);


            // load the orm, but wait for the next cycle doing
            // this, preventing a reload when the user adds his 
            // extensions in time
            process.nextTick(function() {
                this._initializeOrm(function(err){
                    this._loaded = true;
                    this._loading = false;
                    this.emit('load', err);
                }.bind(this));
            }.bind(this));            
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
         * rebuilds the orm from scratch
         */
        , reload: function(callback) {
            if (!this._loading) {
                this._loaded = false;

                this._initializeOrm(function(err) {
                    this._loaded = true;
                    this._loading = false;
                    this.emit('reload', err);
                    if (callback) callback(err);
                }.bind(this));
            }
            else {
                this.once('reload', function() {
                    this.relaod(callback);
                }.bind(this));
            }
        }


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
            , function(db, next){
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
            , function(db, definition, next){
                var newDefinition = {};

                if (this[db.databaseName]) next(new Error('Failed to load ORM for database «'+db.databaseName+'», the name is reserved for the orm.').setName('ORMException'));
                else {
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
        , _initializeDatabases: function(options){
            if (type.object(options)) {
                Object.keys(options).forEach(function(databaseName){
                    if (!type.string(options[databaseName].type)) throw new Error('['+databaseName+'] > Database type not in config specified (type: \'mysql\' / \'postgres\')!');
                    if (!type.array(options[databaseName].hosts) || !options[databaseName].hosts.length) throw new Error('['+databaseName+'] > Please add at least one host per db in the config!');
                    
                    this._dbs.push({
                          databaseName  : databaseName
                        , config        : options[databaseName]
                    });

                    this._databases[databaseName] = new DBCluster({type: options[databaseName].type});

                    options[databaseName].hosts.forEach(function(config){
                        config.database = config.database || databaseName;
                        this._databases[databaseName].addNode(config);
                    }.bind(this));
                }.bind(this));
            }
            else throw new Error('no database configuration present!');
        }
    });
    
    

    // set static methods on the ORM constructor
    Class.implement(new StaticORM(), ORM);
    
    // export the set so extensions can make use of it
    ORM.Set = Set;

    module.exports = ORM;    
}();
