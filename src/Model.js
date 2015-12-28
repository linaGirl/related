(function() {
    'use strict';


    let Class       = require('ee-class');
    let type        = require('ee-types');
    let log         = require('ee-log');



    

    module.exports = new Class({
        
        // make sure we dont inherit obejct methods
        inherits: null



        // flags if the model was laoded from the db
        , $isNew: true


        // flags if there are changed values on the
        // model
        , $isDirty: false


        // holds al values that are used by the 
        // model itself and cannot be used for 
        // the values
        , $reservedProperties: new Set([
              'init'
            , 'save'
            , 'delete'
            , 'set'
            , 'get'
            , 'on'
            , 'once'
            , 'off'
            , 'toJSON'
            , 'isDirty'
            , 'isNew'
            , 'populateFromDatabase'
            , '$database'
            , '$definition'
            , '$listeners'
            , '$reservedProperties'
            , '$isNew'
            , '$isDirty'
            , '$selectedColumns'
            , '$dirtyValues'
        ])



        /**
         * set up the related orm
         */
        , init: function(options) {

        }



        , save: function() {

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
            if (!this.$reservedProperties.has(columnName)) this[columnName] = value;

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
            if (!this.$definition.columns.has(columnName)) throw new Error(`Cannot get value, the column ${columnName} does not exist on the entitiy '${this.$definition.getAliasName()}'!`);
            else {
                if (this.$reservedProperties.has(columnName)) return this.$values.get(columnName);
                else return this[columnName] || this.$values.get(columnName); 
            }
        }










        , on: function(eventName) {
            if (!this.$listeners) this.$listeners = new Map();
            if (!this.$listeners.has(eventName)) this.$listeners.set(eventName, new Set());
        }



        , once: function(eventName) {
            if (!this.$listeners) this.$listeners = new Map();
            if (!this.$listeners.has(eventName)) this.$listeners.set(eventName, new Set());

        }



        , off: function(eventName, listener) {
            if (!this.$listeners) this.$listeners = new Map();

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
            return this.$isDirty || this.isNew() || Array.prototype.slice.call(this.$definition.columns.keys()).some((columnName) => {
                // check for changed values
                

                // maybe the value was set using the 
                // setter and the dirty flags is set
                if (this.$dirtyValues.has(columnName)) return true;


                // ignore reserved columns, they must
                // store theirs values using the setter
                else if (!this.$reservedProperties.has(columnName)) {

                    // if the value was loaded from the db we have to compare
                    if (this.$selectedColumns.has(key)) {

                        // the value is from the db, compare with 
                        // the current value
                        return this.$values.get(columnName) !== this[columnName];
                    }


                    // newly added values
                    else {

                        // undefined is the only value that isnt rela value
                        // every except that will count as change!
                        return !type.undefined(this[columnName]);
                    }
                }
                


                // reserved values must use the setter, thus 
                // there cannot be a change
                else return false;
            });
        }








        /**
         * sets the values from the database
         */
        , populateFromDatabase: function(values, selectedColumns) {

            // this method is only called if the
            // model was loaded from the db
            Class.define(this, '$isNew', Class(false).Writable());


            // store values locally
            Object.keys(values).forEach((columnName) => {
                this.$values.set(columnName, values[columnName]);

                // set directly on the local context 
                // if the property isn't already in use
                if (!this.$reservedProperties.has(columnName)) this[columnName] = values[columnName];
            });


            return this;
        }
    });
})();
