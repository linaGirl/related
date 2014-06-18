!function(){

    var   Class         = require('ee-class')
        , log           = require('ee-log')
        , type          = require('ee-types')
        , EventEmitter  = require('ee-event-emitter')
        , debug         = require('ee-argv').has('debug-sql')
        , async         = require('ee-async')
        , argv          = require('ee-argv')
        , DBCluster     = require('ee-db-cluster'); //*/require('../../ee-db-cluster');


    var   Database      = require('./Database')
        , StaticORM     = require('./StaticORM')
        , staticORM;


    var dev = argv.has('dev-orm');




    var ORM = new Class({
        inherits: EventEmitter

        , init: function(options) {
            Class.define(this, '_options', Class(options));
            Class.define(this, '_dbs', Class([]));
            Class.define(this, '_databases', Class({}));


            // db connectivity
            this._initializeDatabases(options);

            this._initializeOrm(function(err){
                this._loaded = true;
                this.emit('load', err);
            }.bind(this));
        }


        , isLoaded: function() {
            return !!this._loaded;
        }


        // reload definitions
        , reload: function(callback) {
            this._loaded = false;
            this._initializeOrm(function(err){
                this._loaded = true;
                callback(err);
            }.bind(this));
        }


        , getORM: function() {
            return ORM;
        }


        , _initializeOrm: function(callback) {
            if (dev) log.debug('initializing ORM ...');

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
                if (this[db.databaseName]) next(new Error('Failed to load ORM for database «'+db.databaseName+'», the name is reserved for the orm.').setName('ORMException'));
                else {

                    // create names for mapping / reference accessor, handle duplicates
                    this._manageAccessorNames(definition, db);

                    if (dev) log.debug('creating new db instance for «'+db.databaseName+'»...');

                    this[db.databaseName] = new Database({
                          orm:          this
                        , definition:   definition
                        , database:     this._databases[db.databaseName]
                        , timeouts:     db.config.timeouts
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

                    if (column.name === timestamps.created) Class.define(model, 'createdTimestamp', Class(column.name).Enumerable());
                    if (column.name === timestamps.updated) Class.define(model, 'updatedTimestamp', Class(column.name).Enumerable());
                    if (column.name === timestamps.deleted) Class.define(model, 'deletedTimestamp', Class(column.name).Enumerable());
                    if (column.name === nestedSet.left) isNestedSet++;
                    if (column.name === nestedSet.right) isNestedSet++;

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


        , getDatabase: function(id){
            if (!type.string(id) || !id.length) throw new Error('cannot return a db without knowing which on to return (argument 0 must be the db id!)');
            return this._databases[id];
        }


        , doItAll: function() {
            log.wtf('hui');
        }


        , _initializeDatabases: function(options){
            if (type.object(options)) {
                Object.keys(options).forEach(function(databaseName){
                    if (!type.string(options[databaseName].type)) throw new Error('['+databaseName+'] > Database type not in config specified (type: \'mysql\' / \'postgres\')!');
                    if (!type.array(options[databaseName].hosts) || !options[databaseName].hosts.length) throw new Error('['+databaseName+'] > Please add at least one host per db in the config!');
                    

                    // the orm is able to handle timstamp columns like
                    // created, updated & deleted. if the deleted timestamp 
                    // is present on a- table it will not delete records
                    // when delete is called, but mark them as deleted. 
                    // deleting records on such records requires the user 
                    // to call the delete method with the «true» parameter
                    // queries on such entities will also be filtered by default 
                    // for columns that ar not null. if you wish to load 
                    // also records which are soft deleted you have to configure
                    // your query with the «ignoreSoftDelete()» method on any
                    // of the querybuilde robjects.
                    if (options[databaseName] && options[databaseName].timestamps) {
                        if (options[databaseName].timestamps === true) {
                            options[databaseName].timestamps = {};
                            options[databaseName].timestamps.created = 'created';
                            options[databaseName].timestamps.updated = 'updated';
                            options[databaseName].timestamps.deleted = 'deleted';
                        }
                    }

                    // the orm is able to manage nested sets
                    if (options[databaseName] && options[databaseName].nestedSet) {
                        if (options[databaseName].nestedSet === true) {
                            options[databaseName].nestedSet = {};
                            options[databaseName].nestedSet.left = 'left';
                            options[databaseName].nestedSet.right = 'right';
                        }
                    }

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
    
    module.exports = ORM;
    
}();
