    !function(){

    var   Class         = require('ee-class')
        , type          = require('ee-types')
        , log           = require('ee-log');




    module.exports = new Class({
        inherits: Array

        /**
         * class constructor
         */
        , init: function init(options){
            Object.defineProperty(this, '_primaryKeys', {value: options.primaryKeys});
            Object.defineProperty(this, '_name', {value: options.name});
            Object.defineProperty(this, '_maps', {value: {_primary: {}}});

            // the resource that led to the creation of this set, 
            // it is used by the nested set functionality to apply
            // the correct filter to the nested set queries
            Object.defineProperty(this, '_resource', {value: options.resource});

            Array.prototype.constructor.call(this);
        }


        /**
         * returns the resource which was used to load this set from the db
         */
        , getResource: function() {
            return this._resource;
        }


        /**
         * add an row to the set, checks if an row is already in the
         * set, doesn't add it twice
         * 
         * @param <Object> row
         */
        , push: function(row) {
            // we need unique items by primary key
            var key = '';

            this._primaryKeys.forEach(function(keyName){
                key += row[keyName];
            }.bind(this));

            if (this._maps._primary[key]){
                // this value was added before
                row._mappingIds.forEach(function(id){
                    this._maps._primary[key]._mappingIds.push(id);
                }.bind(this));
                return this.length;
            }
            else {
                this._maps._primary[key] = row;
                return Array.prototype.push.call(this, row);
            }
        }

        
        /**
         * returns the first row of the set
         */
        , first: function(){
            return this[0];
        }


        /**
         * returns the last row of the set
         *
         * @retuns <Object> if there is at least on row or undefined
         */
        , last: function() {
            return this.length ? this[this.length-1] : undefined;
        }


        /**
         * returns an array containing all the values of one column
         *
         * @param <String> optional name of the column to return, defaults to «id»
         *
         * @retuns <Array>
         */
        , getColumnValues: function(column) {
            column = column || 'id';

            return this.map(function(row){
                return row[column];
            });
        }


        /**
         * returns an array containing the all ids of the set
         *
         * @retuns <Array>
         */
        , getIds: function() {
            return this.getColumnValues();
        }




        /**
         * returns all rows that have a specoific value in a specifi column
         *
         * @param <String> the column to filter
         * @param <Mixed> the value to filter for
         */
        , getByColumnValue: function(column, value) {
            if (!this._maps[column]) this.createMap(column);
            return this._maps[column] ? this._maps[column][value] : undefined;
        }



        /**
         * creates a map of the values for a column, so that rows can be 
         * accessed by the value of a specific column. if the column is 
         * not unique mulltiple rows may be returned
         *
         * @param <String> column name to create the map for
         */
        , createMap: function(column) {
            if (!this._maps[column]) {
                this._maps[column] = {};

                this.forEach(function(row) {
                    if (!this._maps[column][row[column]]) this._maps[column][row[column]] = [];
                    this._maps[column][row[column]].push(row);
                }.bind(this));
            }
        }



        /**
         * log or return the rows as an array 
         * 
         * @param <Boolean> if true the values are not logged but returned
         */
        , dir: function(returnResult) {
            var result = [];
            this.forEach(function(item){
                result.push(item.dir(true));
            });

            if (returnResult) return result;
            else log(result);
        }


        /**
         * return the values as plain array, the contained rows are still orm 
         * model objects, in opposite top the toJSON method
         *
         * @returns <Array> array
         */
        , toArray: function() {
            return this.slice();
        }



        /**
         * returns a plain js array containing plain js objects representing 
         * the sets contents
         */
        , toJSON: function() {
            return this.map(function(item){
                return item.toJSON ? item.toJSON() : undefined;
            }.bind(this));
        }
    });
}();
