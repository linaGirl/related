!function() {
    'use strict';

    var   Class     = require('ee-class')
        , log       = require('ee-log');


    // model definition
    module.exports = new Class({

        init: function(definition) {
            this.name               = definition.name;
            this.aliasName          = definition.aliasName;
            this.isMapping          = definition.isMapping;
            this.columns            = definition.columns;
            this.primaryKeys        = definition.primaryKeys;


            // extract info
            this.databaseName       = definition.getDatabaseName();
            this.databaseAliasName  = definition.getDatabaseAliasName();
            this.tableName          = definition.getTableName();
        }



        /*
         * chck if this model has a specifi column
         */
        , hasColumn: function(column) {
            return !!this.columns[column];
        }


        /*
         * return the name of the table this model belongs to
         */
        , getTableName: function() {
            return this.tableName;
        }


        /*
         * return the name of the database this model belongs to
         */
        , getDatabaseName: function() {
            return this.databaseName;
        }


        /*
         * return the name of the database this model belongs to
         */
        , getDatabaseAliasName: function() {
            return this.databaseAliasName ||this.databaseName;
        }
    });
}();
