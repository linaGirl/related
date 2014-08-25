!function(){

    var   Class                 = require('ee-class')
        , EventEmitter          = require('ee-event-emitter')
        , log                   = require('ee-log')
        , argv                  = require('ee-argv')
        , Entity                = require('./Entity')
        , buildTransaction      = require('./TransactionBuilder');



    var dev = argv.has('dev-orm');



    module.exports = new Class({
        inherits: EventEmitter

        , init: function(options) {            
            if (dev) log.warn('initialize new db instance for «'+options.databaseName+'»...');

            Class.define(this, '_orm', Class(options.orm));
            Class.define(this, '_database', Class(options.database));
            Class.define(this, '_queryBuilders', Class({}));
            Class.define(this, '_models', Class({}));
            Class.define(this, '_databaseName', Class(options.databaseName));
            Class.define(this, '_extensions', Class(options.extensions));

                       
            // initialize the orm
            this._initialize(options.definition);

            // generate transactio nclass
            this.Transaction = buildTransaction(this);

            // emit load not before the next main loop execution
            process.nextTick(function(){
                this.emit('load');
            }.bind(this));
        }


        , isTransaction: function(){
            return false;
        }


        , createTransaction: function() {
            return new this.Transaction();
        }


        , executeQuery: function(mode, query, callback) {
            this._database.query(mode, query, callback);
        }


        /*
         * returns the orm this database is attached to
         */
        , getOrm: function() {
            return this._orm;
        }


        /*
         * returns this, used for multiple components
         * which need to acces this via this method
         */
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

                //store this reference for the use in transactions
                this._models[tablename] = this[tablename];
            }.bind(this));
        }

    });
}();
