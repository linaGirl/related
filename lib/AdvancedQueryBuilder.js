!function() {
    'use strict';

    var   Class     = require('ee-class')
        , log       = require('ee-log')
        , type      = require('ee-types');



    /*
     * Build Advanced Query
     */
    module.exports = new Class({


        init: function(query) {
            // the query we're working on
            this._query = query;

            // register myself for execution
            this._query.setQueryBuilder(this);
        }



        /*
         * add and'ed items to the query
         */
        , and: function() {
            var items =  Array.prototype.slice.call(arguments);
            items.mode = 'and';
            this._rootItem = items;
            return items;
        }


        /*
         * add or'ed items to the query
         */
        , or: function() {
            var items =  Array.prototype.slice.call(arguments);
            items.mode = 'or';
            this._rootItem = items;
            return items;
        }



        /*
         * apply my filters to the root resource
         */
        , apply: function(filter, rootQuery) {
            var filters = this._applyTo(this._rootItem, rootQuery);
            filter._ = filters;
        }


        /*
         * buid filters
         */
        , _applyTo: function(list, rootQuery) {
            var filters = [];

            // set the type of the filter combination
            filters.mode = list.mode;


            list.forEach(function(item) {
                if (type.array(item)) {
                    // nested item
                    filters.push(this._applyTo(item, rootQuery));
                }
                else if (type.object(item)) {
                    // filter set
                    Object.keys(item).forEach(function(key) {
                        var   filter        = {}
                            , entityName    = this._join(rootQuery, key);

                        filter[entityName] = {};
                        filter[entityName][key.substr(key.lastIndexOf('.')+1)] = item[key];

                        filters.push(filter);
                    }.bind(this));
                }
                else throw new Error('Invalid filter definition, expexted array or object, got «'+type(item)+'»!');
            }.bind(this));

            return filters;
        }



        /*
         * force the orm to join the required tables, return the alias name of the
         * affetced table
         */
        , _join: function(rootQuery, path) {
            var   parts         = path.split(/\./g)
                , targetEntity;

            if (parts.length === 1) {
                return rootQuery.getresource().getAliasName();
            }
            else if (parts.length > 1) {
                targetEntity = this._joinPath(rootQuery, parts.slice(0, -1));
                return targetEntity.getresource().getAliasName();
            }
            else throw new Error('Failed to determine entity!');
        }



        /*
         * force the orm to join a path
         */
        , _joinPath: function(queryBuilder, parts) {
            if (parts.length === 0) {
                return queryBuilder;
            }
            else {
                return this._joinPath(queryBuilder.leftJoin(parts[0], true), parts.slice(1));
            }
        }
    });
}();
