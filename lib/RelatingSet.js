(function() {
    'use strict';


    var   Class         = require('ee-class')
        , type          = require('ee-types')
        , async         = require('ee-async')
        , debug         = require('ee-argv').has('dev-orm')
        , Arguments     = require('ee-arguments')
        , log           = require('ee-log');



    var proto = Array.prototype;



    module.exports = new Class({
        inherits: Array

         // should this quer be debugged?
        , _debugMode: false



        , init: function(options) {
            Class.define(this, '_orm'               , Class(options.orm));
            Class.define(this, '_definition'        , Class(options.definition));
            Class.define(this, '_relatesTo'         , Class(options.related));
            Class.define(this, '_column'            , Class(options.column));
            Class.define(this, '_database'          , Class(options.database));
            Class.define(this, '_databaseAlias'     , Class(options.databaseAlias));
            Class.define(this, '_workerCount'       , Class(0).Writable());
            Class.define(this, '_originalRecords'   , Class([]).Writable());

            Class.define(this, 'isMapping'          , Class(!!options.isMapping));
            Class.define(this, '_queries'           , Class([]));
            Class.define(this, '_pool'              , Class(null).Writable().Configurable());

            this.Model = this._orm[this._databaseAlias][this._definition.name];
        }



        /**
         * enable the bug mode
         *
         * @param <Boolean> optional mode
         */
        , setDebugMode: function(status) {
            this._debugMode = type.undefined(status) ? true : !!status;
            return this;
        }


        

        /**
         * sets the pool for all transactions executed on this model
         */
        , setPool: function(pool) {
            this._pool = pool;
        }



        // save changes on the
        , save: {value: function() {
            var   args          = new Arguments(arguments)
                , callback      = args.getFunction(() => {})
                , noReload      = args.getBoolean(false)
                , transaction   = args.getObject();

            if (transaction) {
                this._save(transaction, noReload, callback);
            }
            else {
                transaction = this.getDatabase().createTransaction(this._pool);

                this._save(transaction, noReload, (err) => {
                    if (err) {
                        transaction.rollback().then(() => {
                            callback(err);
                        }).catch(callback);
                    }
                    else {
                        transaction.commit().then(() => {
                            callback(null, this);
                        }).catch(callback);
                    }
                });
            }

            return this;
        }}
        


        // save changes on the
        , _save: {value: function(transaction, noReload, callback) {
            if (debug) log.info('Relatingset for «'+this._definition.name+'» is storing its items ...');


            // get items stored as query
            this._addQueryItems(transaction, function(err) {
                if (err) callback(err);
                else {
                    async.each(this, function(item, next){
                        if (!item.isFromDatabase() || !item.isSaved()) {
                            // we have to save this item before we can proceed
                            // if we're a belongs to set we need to set our id on the item
                            //log.warn('unsaved item');
                            if (!this.isMapping) {
                                //log(this._definition.targetColumn, this._relatesTo[this._column.name]);
                                item[this._definition.targetColumn] = this._relatesTo[this._column.name];
                                //item[this._relatesTo.getDefinition().name] = this._relatesTo;
                            }

                            item.setDebugMode(this._debugMode);

                            item.setPool(this._pool);

                            item.save(transaction, noReload, next);
                        }
                        else next();
                    }.bind(this), function(err){
                        if (err) callback(err);
                        else {
                            this._getChangedRecords(function(err, added, removed) {
                                if (err) callback(err);
                                else {
                                    if (debug) log.info('Relatingset for «'+this._definition.name+'» analyzed its changes: ['+(added.length+'').yellow+'] items were added, ['+(removed.length+'').red+'] items were removed ...');

                                    // create / remove relational records
                                    async.wait(function(done) {
                                        this._deleteRelationRecords(removed, transaction, noReload, done);
                                    }.bind(this), function(done) {
                                        this._createRelationRecords(added, transaction, noReload, done);
                                    }.bind(this), callback);
                                }
                            }.bind(this));
                        }
                    }.bind(this));
                }
            }.bind(this));
        }}



        /*
         * execute queries, add the items
         */
        , _addQueryItems: function(transaction, callback) {
            async.each(this._queries, function(config, done) {
                config.query.setDebugMode(this._debugMode);

                config.query.pool(this._pool || 'read');

                config.query.find(function(err, set) {
                    if (err) done(err);
                    else if(!set || !set.length) done();
                    else {
                        try {
                            if (config.mode === 'splice') this.splice.apply(this, [config.position, 0].concat(proto.slice.call(set, 0)));
                            else {
                                set.forEach(function(item) {
                                    this[config.mode](item);
                                }.bind(this));
                            }
                        } catch (err) {
                            if (err) return done(err);
                        }

                        done();
                    }
                }.bind(this), transaction);
            }.bind(this), callback);
        }



        , _getChangedRecords: {value: function(callback){
            var   removed       = []
                , added         = []
                , originalMap   = this._createMap(this._originalRecords)
                , currentMap    = this._createMap(this);

            // adde items
            Object.keys(currentMap).forEach(function(newItemKey){
                if (!originalMap[newItemKey]) {
                    // new item
                    added.push(currentMap[newItemKey]);
                }
            }.bind(this));

            // removed items
            Object.keys(originalMap).forEach(function(oldItemKey){
                if (!currentMap[oldItemKey]) {
                    // new item
                    removed.push(originalMap[oldItemKey]);
                }
            }.bind(this));

            callback(null, added, removed);
        }}


        , _createRelationRecords: { value: function(addedRecords, transaction, noReload, callback) {
            async.each(addedRecords, function(record, next){
                if (this.isMapping) {
                    var values = {};

                    values[this._definition.via.fk] = this._relatesTo[this._column.name];
                    values[this._definition.via.otherFk] = record[this._definition.column.name];

                    // add to original records 
                    this._originalRecordsPush(record);

                    // remove them if saving failed!
                    transaction.once('rollback', function() {
                        var index = this._originalRecords.indexOf(record);
                        if (index >= 0) this._originalRecords.splice(index, 1);
                    }.bind(this));
                    

                    if (debug) log.info('Relatingset for «'+this._definition.name+'» is storing a new relation record ...');
                    new this._orm[this._definition.model.getDatabaseName()][this._definition.via.model.name](values).setDebugMode(this._debugMode).save(transaction, next);
                }
                else next();
            }.bind(this), callback);
        }}


        , _deleteRelationRecords: {value: function(removedRecords, transaction, noReload, callback) {
            async.each(removedRecords, function(record, next){
                if (this.isMapping) {
                    // mapping, notexplicitly selected
                    var values = {};

                    values[this._definition.via.fk] = this._relatesTo[this._column.name];
                    values[this._definition.via.otherFk] = record[this._definition.column.name];

                    // remove records when deletion was successfull
                    transaction.once('commit', function(){
                        var index = this._originalRecords.indexOf(record);
                        if (index >= 0) this._originalRecords.splice(index, 1);

                        index = this.indexOf(record);
                        if (index >= 0) proto.splice.call(this, index, 1);
                    }.bind(this));

                    if (debug) log.info('Relatingset for «'+this._definition.name+'» is deleting a relation record ...');
                    transaction[this._definition.via.model.name](values).setDebugMode(this._debugMode).delete(next)
                }
                else if (this._definition.model.isMapping) {
                    // mapping, explicitly selected
                    var values = {};

                    // get mapping columns
                    this._definition.model.mappingColumns.forEach(function(columnName) {
                        values[columnName] = record[columnName];
                    }.bind(this));

                    // records were removed before
                    if (debug) log.info('Relatingset for «'+this._definition.name+'» is deleting a relation record ...');
                    transaction[this._definition.model.name](values).limit(1).setDebugMode(this._debugMode).delete(next)
                }
                else next();
            }.bind(this), callback);
        }}





        , _createMap: {value: function(items){
            var   map = {}
                , primaryKeys = this._relatesTo.getDefinition().primaryKeys;

            items.forEach(function(item){
                var compositeKey = '';

                primaryKeys.forEach(function(key){
                    compositeKey += '|'+item[key];
                }.bind(this), '');

                map[compositeKey] = item;
            });

            return map;
        }}




        // reload all records
        , reload: {value: function(callback, transaction) {
            // check if there are unsaved values on the relation, then reload all of them
            this._reload(callback, (transaction || this._relatesTo._getDatabase()));
        }}


        , _reload: {value: function(callback, transaction) {
            // check if there are unsaved values on the relation, then reload all of them

            this._getChangedRecords(function(err, added, removed){
                if (err) callback(err);
                else {
                    //log.error('reloading for relating sets needs to be implemented.');
                    return callback();
                    if (added.length || removed.length) callback(new Error('Cannot reload relation «'+this._definition.name+'» on model «'+this._relatesTo.getEntityName()+'», there are unsaved changes!'));
                    else {


                        if (this.isMapping) {
                            // create a map of existing ids
                            var query = {

                            };
                        }
                        else {

                        }
                    }
                }
            }.bind(this));
        }}



        /*
         * the push() method accepts eiteher a quer yor a saved or not saved
         * model of the target entity.
         *
         * @param <Object> item: query or model
         * @param <Function> callback
         */
        , push: { value: function push (item) {
            //this.emit('change');

            if (type.object(item)) {
                // check if the item is a model or a query
                if (type.function(item.isQuery) && item.isQuery()) this._queries.push({mode:'push', query: item});
                else {
                    if (this._isCorrectType(item)) this._protoPush(item);
                    else throw new Error('Cannot add models of type «'+(item && item.getEntityName ? item.getEntityName() : 'unknown')+'» to a relatingSet of type «'+this._definition.name+'»!');
                }
            }
            else throw new Error('Cannot add item of type «'+type(item)+'» to a relatingSet of type «'+this._definition.name+'», expected model or query!');

            return this.length;
        }}




        , splice: {value:function(index, howMany) {
            var removedItems = proto.splice.call(this, index, howMany)
                , item;

            //this.emit('change');

            if (arguments.length > 2) {
                for (var i = 2, l = arguments.length; i< l; i++ ) {
                    item = arguments[i];

                    if (type.object(item)) {
                        // check if the item is a model or a query
                        if (type.function(item.isQuery) && item.isQuery()) this._queries.push({mode:'splice', position: index,  query: item});
                        else {
                            if (this._isCorrectType(item)) proto.splice.call(this, index, 0, item);
                            else throw new Error('Cannot add models of type «'+item.getEntityName()+'» to a relatingSet of type «'+this._definition.name+'»!');
                        }
                    }
                    else throw new Error('Cannot add item of type «'+type(item)+'» to a relatingSet of type «'+this._definition.name+'», expected model or query!');
                }
            }

            return removedItems;
        }}








        , clear: {value:function() {
            if (this.length) return proto.splice.call(this, 0, this.length);
        }}







        , unshift: {value: function(item, callback){
            //this.emit('change');

            if (type.object(item)) {
                // check if the item is a model or a query
                if (type.function(item.isQuery) && item.isQuery()) this._queries.push({mode:'unshift', query: item});
                else {
                    if (this._isCorrectType(item)) proto.splice.unshift(this, item);
                    else throw new Error('Cannot add models of type «'+item.getName()+'» to a relatingSet of type «'+this._definition.name+'»!');
                }
            }
            else throw new Error('Cannot add item of type «'+type(item)+'» to a relatingSet of type «'+this._definition.name+'», expected model or query!');

            return this.length;
        }}



        // internal only method for adding records which were already mappend to the collection
        , addExisiting: { value: function(item){
            this._originalRecordsPush(item);
            this._protoPush(item);
        }}


        // add to original records
        , _originalRecordsPush: {value: function(item) {
            item.on('delete', function(){
                var idx = this._originalRecords.indexOf(item);
                if (idx >= 0) this._originalRecords.splice(idx, 1);
            }.bind(this));

            this._originalRecords.push(item);
        }}


        , _protoPush: { value: function(item){
            item.on('delete', function(){
                var idx = this.indexOf(item);
                if (idx >= 0) this.splice(idx, 1);
            }.bind(this));

            proto.push.call(this, item);
        }}


        // check if a model is typeof this
        , _isCorrectType: { value: function(model){
            return model && type.function(model.getEntityName) && model.getEntityName() === this._definition.model.name;
        }}




        , pop: { value: function pop () {
            pop.parent();
        }}



        , shift: { value: function shift () {
            shift.parent();
        }}



        // inheriting from the array type, have to implement event by myself
        , _events: {value: {}, writable: true}

        // on
        , on: {value: function(evt, listener){
            if (!this._events[evt]) this._events[evt] = [];
            this._events[evt].push({fn: listener});
        }}

        // once
        , once: {value: function(evt, listener){
            if (!this._events[evt]) this._events[evt] = [];
            this._events[evt].push({fn: listener, once: true});
        }}

        // emit
        , emit: {value: function(evt){
            var rm = [];

            if (this._events[evt]) {
                this._events[evt].forEach(function(listener){
                    listener.fn.apply(null, Array.prototype.slice.call(arguments, 1));
                    if (listener.once) rm.push(listener);
                });

                rm.forEach(function(listener){
                    this.off(evt, listener);
                }.bind(this));
            }
        }}

        // off
        , off: {value: function(evt, listener){
            var index;

            if (evt === undefined) this._events = {};
            else if (evt) {
                if (listener === undefined) delete this._events[evt];
                else if(this._events[evt]) {
                    index = this._events[evt].indexOf(listener);
                    if (index >= 0) this._events[evt].splice(index, 1);
                }
            }
        }}

        , dir: {value: function(returnResult) {
            var result = [];
            this.forEach(function(item){
                result.push(item.dir(true));
            });

            if (returnResult) return result;
            else log(result);
        }}

        , toJSON: {value: function() {
            return this.map(function(item){
                return item.toJSON ? item.toJSON() : undefined;
            }.bind(this));
        }}
    });
})();
