(function() {
    'use strict';


    let Class               = require('ee-class');
    let type                = require('ee-types');
    let log                 = require('ee-log');

    let AsyncEventEmitter   = require('./AsyncEventEmitter');





    // holds al values that are used by the 
    // model itself and cannot be used for 
    // the values
    let reservedProperties = new Set([

        // methods
          'init'
        , 'save'
        , 'delete'
        , 'set'
        , 'get'
        , 'on'
        , 'once'
        , 'off'
        , 'emit'
        , 'toJSON'
        , 'isDirty'
        , 'isNew'
        , 'populateFromDatabase'
        , 'setReferenceFromDatabase'
        , 'prepareSave'
        , 'getTransaction'
        , 'executeInsert'
        , 'executeUpdate'
        , 'hasDirtyColumn'
        , 'hasDirtyMapping'
        , 'hasDirtyReference'
        , 'hasDirtyReferenceBy'
        , 'getCompositeId'
        , 'useTransaction'
        , 'usePool'
        , 'debug'

        // internal storage
        , '$database'
        , '$definition'
        , '$listeners'
        , '$isNew'
        , '$isDirty'
        , '$selectedColumns'
        , '$dirtyValues'
        , '$mappings'
        , '$references'
        , '$referencedBy'
        , '$transaction'
        , '$pool'
        , '$debug'

        // static model events
        , 'onBeforeSave'
        , 'onAfterSave'
        , 'onBeforeDelete'
        , 'onAfterDelete'
        , 'onBeforeUpdate'
        , 'onAfterUpdate'
        , 'onBeforeInsert'
        , 'onAfterInsert'
        , 'beforePrepareSave'
        , 'beforePrepareDelete'
        , 'beforePrepareInsert'
        , 'beforePrepareUpdate'
    ]);



    

    






    module.exports = new Class({
        
        // async event handling
        inherits: AsyncEventEmitter



        // flags if the model was laoded from the db
        , $isNew: true


        // flags if there are changed values on the
        // model
        , $isDirty: false


        // default pool to execute the queries on
        , $pool: 'write'


        // enable debug mode on queries
        // caused by this model
        , $debug: false




        /**
         * dummy constructor, do not remove, the class
         * inheriting from this class calls this method!
         */
        , init: function() {}







        /**
         * saves the changes on the model
         * 
         * this is what happens here:
         *
         * - emits the beforePrepareSave event
         * - executes the prepareSave method, all values that 
         *   were added as queries will be executed here
         * - emits the beforeSave event
         * - checks if there are any changes on the model
         *   or any of the connected models
         * - gets the transaction, creates one if needed
         * - calls the executeInsert or executeUpdate method
         *   (see their respective comments)
         * - emits the afterSave event
         *
         * @returns {promise} promise if no callback was provided
         */
        , save: function(callback) {
            
            return new Promise((resolve, reject) => {

                // first of all, call the before prepare evnt
                this.emit('beforePrepareSave').then((skipMain) => {
                    
                    // check if any of the eventlisteners 
                    // told us to abort and return to the user
                    if (skipMain) resolve();
                    else {

                        // start preparing the entitiy
                        // make sure all queries are executed
                        // so that we can save everything
                        // afterwards
                        return this.prepareSave().then(() => {

                            // emit the before save event
                            return this.emit('beforeSave');
                        }).then((skipMain) => {
                            if (skipMain) resolve();
                            else {

                                // check if therre are any changes
                                if (!this.isDirty()) return this.emit('afterSave').then(resolve);
                                else {


                                    // get the transaction
                                    return this.getTransaction().then((transaction) => {


                                        // decide if its an insert or update
                                        return (this.isNew() ? this.executeInsert : this.executeUpdate)().then(() => {


                                            // execute aftersave event and return
                                            return this.emit('afterSave').then(resolve);
                                        });
                                    });
                                }
                            }
                        });
                    }
                }).catch(reject);
            }).then(() => {
                if (type.function(callback)) callback(null, this);
                else return Promise.resolve(this);
            }).catch((err) => {
                if (type.function(callback)) callback(err);
                else return Promise.reject(err);
            });
        }










        /**
         * executes thee insert action
         *
         * @private
         *
         * @returns {promise}
         */
        , executeInsert: function() {

        }










        /**
         * executes thee update action
         *
         * @private
         *
         * @returns {promise}
         */
        , executeUpdate: function() {

        }











        /**
         * execute queries set on references, mappings
         * and referenced by items
         *
         * @private
         *
         * @returns {promise}
         */
        , prepareSave: function() {

            let promises = [];


            // check all references
            this.$definition.references.forEach((ref, referenceName) => {
                let value = this.get(referenceName);

                // only executing queries
                if (type.object(value) && type.function(value.isRelatedQuery()) && value.isRelatedQuery()) {
                    promises.push(() => {
                        return value.limit(1).find().then((item) => {
                            if (item) this[referenceName] = item;
                            return Promise.resolve();
                        });
                    });
                }
            });



            // check all mappings
            if (this.$mappings) {
                this.$mappings.forEach((ref, mappingName) => {
                    promises.push(this[mappingName].prepare.bind(this[mappingName]));
                });
            }



            // check all referenced bys
            if (this.$referencedBy) {
                this.$referencedBy.forEach((ref, referencedByName) => {
                    promises.push(this[referencedByName].prepare.bind(this[referencedByName]));
                });
            }



            // execute promieses, return
            if (promises.length) return Promise.resolve();
            else {
                return Promise.all(promises).then(() => {
                    return Promise.resolve();
                });
            }
        }












        /**
         * returns a transaction that can be used to
         * save the model and all attached entities
         *
         * @private
         *
         * @returns {promise} transaction
         */
        , getTransaction: function() {
            if (this.$transaction) return Promise.resolve(this.$transaction);
            else {
                return this.$database.createTransaction(this.$pool).then((transaction) => {
                    this.$transaction = transaction;

                    return Promise.resolve(transaction);
                });
            }
        }













        /** 
         * the user may provide a transaction which must
         * be used for working on this model and relatd 
         * models
         *
         * @param {object} transaction
         *
         * @returns {object} this
         */
        , useTransaction: function(transaction) {
            Class.define(this, '$transaction', Class(transaction).Writable().Configurable());

            return this;
        }











        /**
         * set a custom pool to execute stuff on
         *
         * @param {string} poolName
         *
         * @returns {object} this
         */
        , usePool: function(poolName) {
            Class.define(this, '$pool', Class(poolName).Writable());

            return this;
        }











        /**
         * senable / disable the debug mode
         *
         * @param {boolean} status
         *
         * @returns {object} this
         */
        , debug: function(status) {
            Class.define(this, '$debug', Class(type.undefined(status) || status === true).Writable());

            return this;
        }










        , delete: function() {

        }











        /**
         * sets the value of a column on the model
         *
         * @param {string} columnName the name of the column
         * @param {*} the values for the column
         *
         * @returns {object} this
         */
        , set: function(columnName, value) {
            if (!this.$definition.columns.has(columnName)) throw new Error(`Cannot set value, the column ${columnName} does not exist on the entitiy '${this.$definition.getAliasName()}'!`);

            // mark as dirty if required
            if (value !== this.$values.get(columnName)) this.$dirtyValues.add(columnName);

            // store
            this.$values.set(columnName, value);

            // expose on model if possible
            if (!reservedProperties.has(columnName)) this[columnName] = value;

            return this;
        }











        /**
         * returns the value for a given column
         *
         * @param {string} columnName the name of the column
         *
         * @returns {*}
         */
        , get: function(columnName) {
            if (!this.$definition.columns.has(columnName) && !this.$definition.references.has(columnName)) throw new Error(`Cannot get value, the column / rerence ${columnName} does not exist on the entitiy '${this.$definition.getAliasName()}'!`);
            else {
                if (reservedProperties.has(columnName)) return this.$values.get(columnName);
                else return this[columnName] || this.$values.get(columnName); 
            }
        }













        /**
         * indicates if the model is 
         * new or from the db
         *
         * @returns {boolean}
         */
        , isNew: function() {
            return this.$isNew;
        }















        /**
         * flags if any values where changed 
         * on the model
         *
         * @returns {boolean}
         */
        , isDirty: function() {

            // the $isDirty variable is normally
            // not used, it can be usêd by extensionss
            // or custom user models
            return this.$isDirty || 
                this.isNew() || 
                this.hasDirtyColumn() || 
                this.hasDirtyReferences() || 
                this.hasDirtyMappings() || 
                this.hasDirtyReferenceBys();
        }










        /**
         * checks if the value of any column has changed
         *
         * @returns {boolean}
         */
        , hasDirtyColumn: function() {
            for (let columnName of this.$definition.columns.keys()) {

                // maybe the value was set using the 
                // setter and the dirty flags is set
                if (this.$dirtyValues.has(columnName)) return true;


                // ignore reserved columns, they must
                // store theirs values using the setter
                else if (!reservedProperties.has(columnName)) {

                    // if the value was loaded from the db we have to compare
                    if (this.$selectedColumns.has(columnName)) {

                        // the value is from the db, compare with 
                        // the current value
                        if (this.$values.get(columnName) !== this[columnName]) return true;
                    }


                    // newly added values
                    else {

                        // undefined is the only value that isnt rela value
                        // every except that will count as change!
                        if (!type.undefined(this[columnName])) return true;
                    }
                }
            }

            return false;
        }











        /**
         * checks if any reference has changed
         *
         * @returns {boolean}
         */
        , hasDirtyReferences: function() {
            for (let referenceName of this.$definition.references.keys()) {

                // check for changed values
                let value = this[referenceName];
                
                if (type.object(value)) {

                    // got a query
                    if (type.function(value.isRelatedQuery()) && value.isRelatedQuery()) return true;

                    // a model
                    else if (type.function(value.isRelatedModel()) && value.isRelatedModel()) {

                        // check if new
                        if (value.isNew()) return true;

                        // if chnaged since it was laoded
                        else if (value.isDirty()) return true;

                        // newly placed there
                        else if (!this.$references.has(referenceName)) return true;

                        // not the same as when it was loaded from the db
                        else if (this.$references.get(referenceName) !== value.getCompositeId()) return true;
                    }

                    else throw new Error(`The object stored on the references '${referenceName}' property on the '${this.$definition.getAliasName()}' model is neither a query nor a model, expected a model, a query, null or undefined!`);
                }
                else if (type.undefined(value) || type.null(value)) {

                    // value was maybe removed
                    if (this.$references.has(referenceName)) return true;
                }

                // not a vaild option
                else throw new Error(`The value stored on the references '${referenceName}' property on the '${this.$definition.getAliasName()}' model has the type '${type(value)}', expected a model, a query, null or undefined!`);
            }

            return false;
        }













        /**
         * checks if any mappings have changed
         *
         * @returns {boolean}
         */
        , hasDirtyMappings: function() {
            if (this.$mappings) {
                for (let mappingName of this.$mappings.keys()) {
                    if (this[mappingName].isDirty()) return true;
                }
            }

            return false;
        }













        /**
         * checks if any referencedBys have changed
         *
         * @returns {boolean}
         */
        , hasDirtyReferenceBys: function() {
            if (this.$referencedBy) {
                for (let referencedByName of this.$referencedBy.keys()) {
                    if (this[referencedByName].isDirty()) return true;
                }
            }

            return false;
        }















        /**
         * sets the values from the database
         *
         * @private
         *
         * @param {object} values the values loaded from the db
         * @param {array} the columns that were loaded from the db
         *
         * @returns {this}
         */
        , populateFromDatabase: function(values, selectedColumns) {

            // this method is only called if the
            // model was loaded from the db
            Class.define(this, '$isNew', Class(false).Writable());


            // store values locally
            if (values) {
                Object.keys(values).forEach((columnName) => {
                    this.$values.set(columnName, values[columnName]);

                    // set directly on the local context 
                    // if the property isn't already in use
                    if (!reservedProperties.has(columnName)) this[columnName] = values[columnName];
                });
            }


            // selected columns
            if (selectedColumns) {
                selectedColumns.forEach((columnName) => {
                    this.$selectedColumns.add(columnName);
                });
            }


            return this;
        }











        /**
         * set a reference loaded by th edatabase
         *
         * @private
         *
         * @param {string} referenceName the name fo the reference
         * @param {object} referencedModel the referenced model instance
         *
         * @returns {this}
         *
         */
        , setReferenceFromDatabase: function(referenceName, referencedModel) {

            // check if the reference is valid
            if (!this.$definition.references.has(referenceName)) throw new Error(`Cannot set the reference '${referenceName}' on the '${this.$definition.getAliasName()}' model, no such reference exists on this model!`);

            // store the unique hash of the model 
            // so that changes to the reference can
            // be changed later on
            this.$references.set(referenceName, referencedModel.getCompositeId());

            // store
            this[referenceName] = referencedModel;

            return this;
        }
    });
})();
