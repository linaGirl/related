!function(){

    var   Class         = require('ee-class')
        , EventEmitter  = require('ee-event-emitter')
        , log           = require('ee-log')
        , argv          = require('ee-argv')
        , Entity         = require('./Entity')
        , Transaction   = require('./Transaction');



    var dev = argv.has('dev-orm');



    module.exports = new Class({
        inherits: EventEmitter

        , init: function(options) {            
            if (dev) log.warn('initialize new db instance for «'+options.databaseName+'»...');

            Class.define(this, '_orm', Class(options.orm));
            Class.define(this, '_database', Class(options.database));
            Class.define(this, '_queryBuilders', Class({}));
            Class.define(this, '_databaseName', Class(options.databaseName));
            Class.define(this, '_extensions', Class(options.extensions));


                       
            // initialize the orm
            this._initialize(options.definition);

            // emit load not before the next main loop execution
            process.nextTick(function(){
                this.emit('load');
            }.bind(this));
        }


        , createTransaction: function() {
            return new Transaction(this);
        }


        , executeQuery: function(mode, query, callback) {
            this._database.query(mode, query, callback);
        }



        , _getDatabase: function(){
            return this;
        }


        , _initialize: function(definition){
            Object.keys(definition).forEach(function(tablename){
                if (this[tablename]) next(new Error('Failed to load ORM for database «'+this._databaseName+'», the tablename «'+tablename+'» is reserved for the orm.').setName('ORMException'));
                if (dev) log.debug('['+this._databaseName+'] initializing new model «'+tablename+'» ...');
                
                this[tablename] = new Entity({
                      orm               : this._orm
                    , definition        : definition[tablename]
                    , queryBuilders     : this._queryBuilders
                    , getDatabase       : this._getDatabase.bind(this)
                    , extensions        : this._extensions
                });
            }.bind(this));
        }

    });
}();
