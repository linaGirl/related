(function() {
    'use strict';

    let Class                 = require('ee-class');
    let EventEmitter          = require('ee-event-emitter');
    let log                   = require('ee-log');
    let argv                  = require('ee-argv');
    let QueryContext          = require('related-query-context');

    let Entity                = require('./Entity');
    let buildTransaction      = require('./TransactionBuilder');
    let FunctionContext       = require('./FunctionContext');

    let dev = argv.has('dev-orm');

    let ORM;








    module.exports = new Class({
        inherits: EventEmitter

        , init: function(options) {
            if (dev) log.warn('initialize new db instance for «'+options.databaseName+'»...');

            Class.define(this, '_orm', Class(options.orm));
            Class.define(this, '_database', Class(options.database));
            Class.define(this, '_queryBuilders', Class({}));
            Class.define(this, '_models', Class(new Map()));
            Class.define(this, '_databaseName', Class(options.databaseName));
            Class.define(this, '_extensions', Class(options.extensions));
            Class.define(this, '_definition', Class(options.definition));
            
                       
            // initialize the orm
            this._initialize();


            // build transaction class for this db
            Class.define(this, '_Transaction', Class(buildTransaction(this)));


            // emit load not before the next main loop execution
            process.nextTick(function(){
                this.emit('load');
            }.bind(this));
        }





        /**
         * indicates if this object is a transaction
         */
        , isTransaction: function(){
            return false;
        }







        /** 
         * sets up a new transaction
         *
         * @param pool {string} pool, options pool to create the transaction on
         */
        , createTransaction: function(pool) {
            return new this._Transaction({pool: pool});
        }








        /**
         * execute a function or stored procedure
         *
         * @param {string} function name
         *
         * @returns {functionContext}
         */
        , getFunction: function(functionName) {
            return new FunctionContext(this, this._functions[functionName], functionName);
        }









        /**
         * execute a query
         */
        , executeQuery: function(context, values, pool) {

            // the user may also give us simple sql to execute
            if (typeof context === 'string') {
                context = new QueryContext({
                      sql: context
                    , values: values
                    , pool: pool || 'write'
                });
            }

            return this._database.query(context);
        }
        








        /**
         * execute an ast based query
         *
         * @param {object} queryContext
         * @param {object*} transaction
         *
         * @returns {promise}
         */
        , executeASTQuery: function(queryContext, transaction) {            
            if (transaction) {
                return (queryContext.isReady() ? Promise.resolve() : this.compileASTQuery(queryContext)).then(() => {

                    // execute query
                    return transaction.query(queryContext);
                }).then((data) => {

                    // process results manually
                    return this.processASTQueryResult(queryContext, data);
                });
            }
            else {

                // let the cluster do the wrk
                return this.executeQuery(queryContext);
            }
        }









        /**
         * renders a query
         */
        , renderQuery: function(connection, context) {
            return this._database.renderQuery(connection, context);
        }






        
        /**
         * compile an ast based query
         *
         * @param {object} queryContext the query definition
         *
         * @returns {Promise} 
         */
        , compileASTQuery: function(queryContext) {
            return this._database.compileASTQuery(queryContext);
        }







        
        /**
         * render an ast based query
         *
         * @param {object} queryContext the query definition
         * @param {object} data the data returned from the db
         *
         * @returns {Promise} 
         */
        , processASTQueryResult: function(queryContext, data) {
            return this._database.processASTQueryResult(queryContext, data);
        }
        







        /** 
         * returns an entity model
         *
         * @param {string} entitiyName
         *
         * @returns {object}
         */
        , get: function(entitiyName) {
            return this._models.has(entitiyName) ? this._models.get(entitiyName) : null;
        }








        /**
         * set up the entities
         */
        , _initialize: function() {
            

            // go through all entities
            for (let entityDefinition of this._definition.entities.values()) {
                let entitiyName = entityDefinition.getAliasName();


                // set up the entitiy
                let entity = new Entity({
                      orm               : this._orm
                    , definition        : entityDefinition
                    , queryBuilders     : this._queryBuilders
                    , getDatabase       : this._getDatabase.bind(this)
                    , extensions        : this._extensions
                });


                
                // add to collection
                this._models.set(entitiyName, entity);


                // add a public property if possible
                if (!this[entitiyName]) this[entitiyName] = entity;
            }
        }


        





        /*
         * returns the orm this database is attached to
         */
        , getOrm: function() {
            return this._orm;
        }




        /*
         * return the ORM object used to create filters & more
         */
        , getORM: function() {
            if (!ORM) ORM = require('./ORM');
            return ORM;
        }



        /*
         * returns this, used for multiple components
         * which need to acces this via this method
         */
        , _getDatabase: function(){
            return this;
        }


        /*
         * returns the db name
         */
        , getDatabaseName: function() {
            return this._databaseName
        }


        /**
         * return the db defintion object
         */
        , getDefinition: function() {
            return this._definition;
        }
    });
})();
