!function() {
    'use strict';

    var   Class     = require('ee-class')
        , log       = require('ee-log');


    // extension manager
    module.exports = new Class({

        init: function(ormInstance) {
            Class.define(this, '_extensions', Class([]));
            Class.define(this, '_orm', Class(ormInstance));
        }

        /*
         * add a new extension
         */
        , register: function(extension) {
            // add variables to extension
            extension.setVariables({
                orm: this._orm
            });

            this._extensions.push(extension);
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
}();
