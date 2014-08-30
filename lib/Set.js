    !function(){

    var   Class         = require('ee-class')
        , type          = require('ee-types')
        , log           = require('ee-log');




    module.exports = new Class({
        inherits: Array


        , init: function(options){
            Object.defineProperty(this, '_primaryKeys', {value: options.primaryKeys});
            Object.defineProperty(this, '_name', {value: options.name});
            Object.defineProperty(this, '_maps', {value: {_primary: {}}});

            // the resource that led to the creation of this set, 
            // it is used by the nested set functionality to apply
            // the correct filter to the nested set queries
            Object.defineProperty(this, '_resource', {value: options.resource});
        }


        /*
         * returns the resource which was used to load this set from the db
         */
        , getResource: function() {
            return this._resource;
        }


        , push: function(item) {
            // we need unique items by primary key
            var key = '';

            this._primaryKeys.forEach(function(keyName){
                key += item[keyName];
            }.bind(this));

            if (this._maps._primary[key]){
                // this value was added before
                item._mappingIds.forEach(function(id){
                    this._maps._primary[key]._mappingIds.push(id);
                }.bind(this));
                return this.length;
            }
            else {
                this._maps._primary[key] = item;
                return Array.prototype.push.call(this, item);
            }
        }

        
        , first: function(){
            return this[0];
        }

        , last: function(){
            return this.length ? this[this.length-1] : undefined;
        }


        , getColumnValues: function(column){
            column = column || 'id';

            return this.map(function(row){
                return row[column];
            });
        }


        , getIds: function(){
            return this.map(function(item){ return item.id;});
        }


        , getByColumnValue: function(column, value){
            if (!this._maps[column]) this.createMap(column);
            return this._maps[column] ? this._maps[column][value] : undefined;
        }


        , createMap: function(column){
            if (!this._maps[column]){
                this._maps[column] = {};

                this.forEach(function(item){
                    if (!this._maps[column][item[column]]) this._maps[column][item[column]] = [];
                    this._maps[column][item[column]].push(item);
                }.bind(this));
            }
        }


        , dir: function(returnResult) {
            var result = [];
            this.forEach(function(item){
                result.push(item.dir(true));
            });

            if (returnResult) return result;
            else log(result);
        }


        , toJSON: function() {
            return this.map(function(item){
                return item.toJSON();
            }.bind(this));
        }
    });
}();
