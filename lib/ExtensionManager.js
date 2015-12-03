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
