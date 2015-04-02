!function() {
    'use strict';


    var   Class            = require('ee-class')
        , log              = require('ee-log')
        , type             = require('ee-types');


    /*
     * This class provides the select method on the static orm.
     * this can be used to add select functions to the query.
     *
     */


    module.exports = new Class({


        /**
         * class constructor
         */
        init: function() {

            // storage for the extensions
            this.classDefinition = {
                  extensions: {}
                , init: function(alias) {
                    this.alias = alias;
                }
            };

            // accessors
            this.classConstructor = new Class(this.classDefinition);
        }




        /**
         * returns a new object that exposes all select extensions
         *
         * @param <String> alias
         *
         * @returns <Object> object exposing the select extensions
         */
        , select: function(alias) {
            return new this.classConstructor(alias);
        }




        /**
         * register a new selector extension
         *
         * @param <object> extension
         */
        , registerExtension: function(extension) {
            var name = extension.extensionName;

            if (!extension.isRelatedSelector || !extension.isRelatedSelector()) throw new Error('Cannot register selector extension, expected a class extending from the RelatedSelector class!');
            if (!type.string(name)) throw new Error('Cannot register extension without a name!');
            if (this.classDefinition.extensions[name]) throw new Error('Cannot register «'+name+'» extension, an extension with the same name was already registered before!');

            // store extension
            this.classDefinition.extensions[name] = extension;


            // create accessor on the class
            this.classDefinition[name] = function() {
                var args = new Array(arguments.length);
                for(var i = 0; i < args.length; ++i) args[i] = arguments[i];

                return new this.extensions[name]({
                      parameters : args
                    , alias      : this.alias
                });
            };

            // recerate Class
            this.classConstructor = new Class(this.classDefinition);
        }




        /**
         * appoly this model to the static orm object
         */
        , applyTo: function(obj) {
            obj.select = this.select.bind(this);
        }
    });
}();
