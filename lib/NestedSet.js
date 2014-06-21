!function() {
    'use strict';

    var   Class     = require('ee-class')
        , log       = require('ee-log')
        , async     = require('ee-async')
        , type      = require('ee-types');


    // yummy, this is the nested set implementation for the orm
    module.exports = new Class({

        // flags if there was a modification on the nested set
         _changed: false


        , init: function(options) {
            // required information for db queries
            this.databaseName   = options.databaseName;
            this.entityName     = options.entityName;
            this.orm            = options.orm;

            // the model instance this sists on (the current node)
            this.instance       = options.instance;

            // the names of the left / right properties
            this.left           = options.left;
            this.right          = options.right;

            // a tblae may contain several neted sets
            // we need to filter fro that
            this.groupKey       = options.groupKey;
        }


        // flags if there was a modification on the nested set
        , hasChanged: function() {
            return this._changed;
        }


        /*
         * update the nodes position in the nested set
         */
        , update: function(transaction, callback) {

        }


        /*
         * însert the new node into the nested set
         */
        , insert: function(transaction, callback) {

        }


        /*
         * delete the node from the nested set
         */
        , delete: function(transaction, callback) {

        }
    });
}();
