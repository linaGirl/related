(function() {
    'use strict';


    const Class         = require('ee-class');
    const type          = require('ee-types');
    const debug         = require('ee-argv').has('dev-orm');
    const Arguments     = require('ee-arguments');
    const log           = require('ee-log');
    const Lock          = require('./Lock');



    const proto = Array.prototype;




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
        , save: {value: function(...args) {
            let callback, transaction, stack, lock;
            let dontReload = false;


            args.forEach((arg) => {
                if (type.function(arg))         callback = arg;
                else if (arg instanceof Lock)   lock = arg;
                else if (type.boolean(arg))     dontReload = arg;
                else if (type.array(arg))       stack = arg;
                else if (type.object(arg))      transaction = arg;
            });



            const promise = Promise.resolve().then(() => {
                if (stack) stack.push({entity: this._definition.name, frame: 'save: promise start'});

                if (transaction) return this._save({transaction, dontReload, stack});
                else {
                    if (stack) stack.push({entity: this._definition.name, frame: 'save: create transaction'});
                    transaction = this.getDatabase().createTransaction(this._pool);

                    return this._save({transaction, dontReload, stack, lock}).then(() => {
                        return transaction.commit();
                    }).catch((err) => {
                        return transaction.rollback().then(() => {
                            return Promise.reject(err);
                        }).catch(() => {
                            return Promise.reject(err);
                        });
                    });
                }
            });


            if (type.function(callback)) promise.then(() => callback(null, this)).catch(callback);
            else return promise.then(() => Promise.resolve(this));
        }}
        




        // save changes on the
        , _save: {value: function({transaction, dontReload, stack, lock}) {
            if (stack) stack.push({entity: this._definition.name, frame: '_save: before _addQueryItems'});

            // get items stored as query
            return this._addQueryItems(transaction).then(() => {
                if (stack) stack.push({entity: this._definition.name, frame: '_save: after _addQueryItems'});

                return Promise.all(this.map((item) => {
                    if (!item.isFromDatabase() || !item.isSaved()) {

                        // we have to save this item before we can proceed
                        // if we're a belongs to set we need to set our id on the item
                        if (!this.isMapping) {
                            item[this._definition.targetColumn] = this._relatesTo[this._column.name];
                        }

                        item.setDebugMode(this._debugMode);
                        item.setPool(this._pool);

                        return item.save(transaction, dontReload, stack, lock);
                    } else return Promise.resolve();
                })).then(() => {
                    if (stack) stack.push({entity: this._definition.name, frame: '_save: all saved'});

                    // get diffs
                    const {addedRecords, removedRecords} = this._getChangedRecords();

                    // create / remove relational records
                    return Promise.all([
                        this._deleteRelationRecords({removedRecords, transaction, dontReload, stack, lock}),
                        this._createRelationRecords({addedRecords, transaction, dontReload, stack, lock})
                    ]);
                });
            });
        }}




        /*
         * execute queries, add the items
         */
        , _addQueryItems: function(transaction) {
            return Promise.all(this._queries.map((config) => {
                config.query.setDebugMode(this._debugMode);
                config.query.pool(this._pool || 'read');

                return config.query.find(transaction).then((set) => {
                    if(!set || !set.length) return Promise.resolve();
                    else {
                        try {
                            if (config.mode === 'splice') this.splice.apply(this, [config.position, 0].concat(proto.slice.call(set, 0)));
                            else {
                                set.forEach(function(item) {
                                    this[config.mode](item);
                                }.bind(this));
                            }
                        } catch (err) {
                            if (err) return Promise.reject(err);
                        }

                        Promise.resolve();
                    }
                });
            }));
        }



        , _getChangedRecords: {value: function() {
            const removedRecords= [];
            const addedRecords  = [];
            const originalMap   = this._createMap(this._originalRecords);
            const currentMap    = this._createMap(this);

            // adde items
            Object.keys(currentMap).forEach((newItemKey) => {
                if (!originalMap[newItemKey]) {
                    // new item
                    addedRecords.push(currentMap[newItemKey]);
                }
            });

            // removed items
            Object.keys(originalMap).forEach((oldItemKey) => {
                if (!currentMap[oldItemKey]) {
                    // new item
                    removedRecords.push(originalMap[oldItemKey]);
                }
            });

            return {addedRecords, removedRecords};
        }}





        , _createRelationRecords: { value: function({addedRecords, transaction, dontReload, stack, lock}) {
            if (stack) stack.push({entity: this._definition.name, frame: '_createRelationRecords: start'});

            return Promise.all(addedRecords.map((record) => {
                if (this.isMapping) {
                    const values = {};

                    values[this._definition.via.fk] = this._relatesTo[this._column.name];
                    values[this._definition.via.otherFk] = record[this._definition.column.name];

                    // add to original records 
                    this._originalRecordsPush(record);


                    // remove them if saving failed!
                    transaction.once('rollback', function() {
                        var index = this._originalRecords.indexOf(record);
                        if (index >= 0) this._originalRecords.splice(index, 1);
                    }.bind(this));
                    
                    if (stack) stack.push({entity: this._definition.name, frame: '_createRelationRecords: before new Model().save()', values: values});
                    return new this._orm[this._definition.model.getDatabaseName()][this._definition.via.model.name](values).setDebugMode(this._debugMode).save(transaction, stack, dontReload, lock).then(() => {
                        if (stack) stack.push({entity: this._definition.name, frame: '_createRelationRecords: after new Model().save()', values: values});
                        return Promise.resolve();
                    });
                } else return Promise.resolve();
            }));
        }}



        , _deleteRelationRecords: {value: function({removedRecords, transaction, dontReload, stack}) {
            if (stack) stack.push({entity: this._definition.name, frame: '_deleteRelationRecords: start'});

            return Promise.all(removedRecords.map((record) => {
                if (this.isMapping) {
                    // mapping, notexplicitly selected
                    const values = {};

                    values[this._definition.via.fk] = this._relatesTo[this._column.name];
                    values[this._definition.via.otherFk] = record[this._definition.column.name];


                    // remove records when deletion was successfull
                    transaction.once('commit', function(){
                        var index = this._originalRecords.indexOf(record);
                        if (index >= 0) this._originalRecords.splice(index, 1);

                        index = this.indexOf(record);
                        if (index >= 0) proto.splice.call(this, index, 1);
                    }.bind(this));

                    return transaction[this._definition.via.model.name](values).setDebugMode(this._debugMode).delete();
                } else if (this._definition.model.isMapping) {
                    // mapping, explicitly selected
                    const values = {};

                    // get mapping columns
                    this._definition.model.mappingColumns.forEach(function(columnName) {
                        values[columnName] = record[columnName];
                    }.bind(this));

                    // records were removed before
                    return transaction[this._definition.model.name](values).limit(1).setDebugMode(this._debugMode).delete();
                } else return Promise.resolve();
            })).then(() => {
                if (stack) stack.push({entity: this._definition.name, frame: '_deleteRelationRecords: done'});
                return Promise.resolve();
            });
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
        , reload: {value: function(...args) {
            let callback, transaction;


            args.forEach((arg) => {
                if (type.function(arg))     callback = arg;
                else if (type.object(arg))  transaction = arg;
            });

            if (!transaction) transaction = this._relatesTo._getDatabase();


            const promise = this._reload({transaction});


             // if the user passed a callback, use it. 
            // otherwise return the promise
            if (typeof callback !== 'function') return promise.then(() => Promise.resolve(this));
            else promise.then(() => callback(null, this)).catch(callback);
        }}



        , _reload: {value: function({transaction}) {
            // not implemented :/

            return Promise.resolve();
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
