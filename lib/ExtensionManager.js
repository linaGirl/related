(function() {
    'use strict';

    var   Class     = require('ee-class')
        , log       = require('ee-log');


    // extension manager
    module.exports = new Class({

        init: function(ormInstance) {
            Class.define(this, '_extensions', Class([]));
            Class.define(this, '_orm', Class(ormInstance));
            Class.define(this, '_map', Class({}));
        }


        /*
         * add a new extension
         */
        , register: function(extension) {
            var name = extension.getName();

            // cannot register an extension without a name
            if (!name) throw new Error('Cannot register an extension without a name!');

            // add variables to extension
            extension.setVariables({
                orm: this._orm
            });



            extension.on('reloadEntity', (dbName, entityName) => {
                if (this._orm[dbName] && this._orm[dbName][entityName]) this._orm[dbName][entityName].reload();
                else throw new Error(`Cannot reload entity ${entityName} on database ${dbName} for the extension ${name}: The entity does not exits!`);
            });


            // add to map
            if (!this._map[name]) this._map[name] = [];
            this._map[name].push(extension);

            // store
            this._extensions.push(extension);
        }


        /*
         * return a specifi extension
         */
        , get: function(name) {
            return this._map[name];
        }


        /*
         * return all extension that whish to register
         * themself for the current model
         */
        , getModelExtensions: function(defintion) {
            return this._extensions.filter(function(extension) {
                return extension.useOnModel(defintion);
            }.bind(this));
        }


        // return the amount of extensions registered
        , count: { 
            get: function() {
                return this._extensions.length;
            }
        }
    });
})();
