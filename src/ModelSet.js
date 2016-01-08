(function() {
    'use strict';


    let type                = require('ee-types');
    let log                 = require('ee-log');
    let QueryBuilder;
    let Model;



    // we have to wait for this circle reference
    // to be ready
    process.nextTick(() => {
        QueryBuilder        = require('./QueryBuilder');
        Model               = require('./Model');
    });
    

    



    class ModelSet {



        // returns the current length of the set
        // does not include items added via query
        get length() {
            return this.models.length;
        }

        // alias for the length property
        get size() {
            return this.models.length;
        }







        /**
         * sets up the storage items for the class
         */
        constructor() {

            // instance storage for queries
            Object.defineProperty(this, 'queries', {value: [], writable: true, configurable: true});

            // instance storage for models
            Object.defineProperty(this, 'models', {value: [], writable: true, configurable: true});
        }


















        /**
         * checks if an item is in the set
         *
         * @param {object} item
         *
         * @returns {booleam}
         */
        has(item) {
            if (type.number(item)) {

                // check if the array is longer 
                // then index
                return this.models.length > item;
            }
            else if (type.string(item) && !/[^0-9]/.test(item)) {

                // check if the array is longer 
                // then index
                return this.models.length > parseInt(item, 10);
            }
            else if (item instanceof Model) {
                
                // check if the item is contained
                return this.models.indexOf(item) >= 0;
            }
            else if (item instanceof QueryBuilder) {
                
                // check if the item is contained
                return this.queries.indexOf(item) >= 0;
            }
            else throw new Error(`Cannot check if item is in the set for the mapping between '${this.definition.column.entity.getAliasName()}' and '${this.definition.mappedColumn.entity.getAliasName()}'. Expected a Model, QueryBuilder instance or index, got '${type(item)}'!`);
        }














        /**
         * add a new item to the model set
         *
         * @param {object} item
         */
        add(item) {
            if (item instanceof Model) {
                
                // add the model to this collection
                this.models.push(item);

                return this;
            }
            else if (item instanceof QueryBuilder) {

                // add to queries
                this.queries.push(item);

                return this;
            }
            else throw new Error(`Cannot add item to the mapping between '${this.definition.column.entity.getAliasName()}' and '${this.definition.mappedColumn.entity.getAliasName()}'. Expected a Model or QueryBuilder instance, got '${type(item)}'!`);
        }










        /**
         * removes one item from the set
         *
         * @param {object} item the item to remove
         *
         * @returns {boolean} Returns true if an element in the 
         *                    Set object has been removed 
         *                    successfully; otherwise false.
         */
        delete(item) {
            if (item instanceof Model) {
                
                // delete if available
                if (this.has(item)) {
                    this.models.splice(this.models.indexOf(item), 1);
                    return true;
                }
                else return false;
            }
            else if (item instanceof QueryBuilder) {
                
                // delete if available
                if (this.has(item)) {
                    this.queries.splice(this.queries.indexOf(item), 1);
                    return true;
                }
                else return false;
            }
            else throw new Error(`Cannot delete item from the mapping between '${this.definition.column.entity.getAliasName()}' and '${this.definition.mappedColumn.entity.getAliasName()}'. Expected a Model or QueryBuilder instance, got '${type(item)}'!`);
        }






        






        /**
         * returns an item at a specific index
         *
         * @param {number} index
         *
         * @returns {item|undefined}
         */
        get (index) {
            return this.models[index];
        }






        






        /**
         * stores an item on a specific index
         *
         * @param {number} index
         * @param {*} item
         *
         * @returns {this}
         */
        set (index, item) {
            this.models[index] = item;
            return this;
        }













        /** 
         * clears the set
         */
        clear() {
            this.models = [];
            this.queries = [];
        }









        /**
         * prepares the set so all items can be saved
         * executes queries that were added
         *
         *
         *
         * @returns {promise}
         */
        prepareSave(transaction) {

        }








        /**
         * returns the items as array, does not include
         * items added as query
         *
         * @returns {array}
         */
        toArray() {
            return Array.from(this.models);
        }









        /**
         * lets the user iterate over the entries
         *
         * @returns {iterable}
         */
        entries() {
            return this.models[Symbol.iterator]();
        }







        /**
         * its iterable
         */
        [Symbol.iterator]() {
            let index = 0;

            return {
                next() {

                    if (index < this.length) {
                        return {
                              value: this.get(index)
                            , done: false
                        };
                    }
                    else return {done: true};
                }
            };
        }
    }




    module.exports = ModelSet;
})();
