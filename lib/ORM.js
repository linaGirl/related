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
            Class.define(this, '_dbNames', Class([]));
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

            async.each(this._dbNames

            // remove existing
            , function(databaseName, next){
                if (this[databaseName] && this[databaseName].createTransaction) {
                    if (dev) log.debug('removing existing db instance «'+databaseName+'»...');
                    delete this[databaseName];
                }

                next(null, databaseName);
            }.bind(this)

            // get definition from database
            , function(databaseName, next){
                this._databases[databaseName].describe([databaseName], function(err, databases){
                    if (dev) log.debug('got db definition for «'+databaseName+'»...');

                    if (err) next(err);
                    else {
                        // push config to next step
                        next(null, databaseName, databases[databaseName]);
                    }
                }.bind(this));
            }.bind(this)

            // initialize orm per databse
            , function(databaseName, definition, next){
                if (this[databaseName]) next(new Error('Failed to load ORM for database «'+databaseName+'», the name is reserved for the orm.').setName('ORMException'));
                else {

                    // create names for mapping / reference accessor, handle duplicates
                    this._manageAccessorNames(definition);

                    if (dev) log.debug('creating new db instance for «'+databaseName+'»...');

                    this[databaseName] = new Database({
                          orm:          this
                        , definition:   definition
                        , database:     this._databases[databaseName]
                    });


                    this[databaseName].on('load', next);
                }
            }.bind(this)

            // check for errors
            , function(err, results){
                 if (dev) log.warn('all dbs loaded ...');

                if (err) callback(err);
                else callback();
            }.bind(this));  
        }

        


        , _manageAccessorNames: function(definition) { 
            Object.keys(definition).forEach(function(tablename){
                var   model     = definition[tablename]
                    , usedNames = {};

                Object.keys(model.columns).forEach(function(columnName){
                    var column = model.columns[columnName]
                        , name;

                    if (column.mapsTo) {
                        column.mapsTo.forEach(function(mapping){ 
                            name = mapping.name;

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
                    if (column.referencedModel) {
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
                        
                    this._dbNames.push(databaseName);

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
