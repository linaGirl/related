!function() {
    'use strict';


    var   Class            = require('ee-class')
        , type             = require('ee-types')
        , RelatedSelector  = require('related-selector')
        , sclice           = Array.prototype.slice;


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
            this.classDefinitionn = {
                  extensions: {}
                , init: function(alias) {
                    this.alias = alias;
                }
            };

            // accessors
            this.classConstructor = new Class(this.classDefinitionn);
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
            if (!(extension instanceof RelatedSelector)) throw new Error('Cannot register selector extension, expected a class extending from the RelatedSelector class!');
            if (!type.string(extension.name)) throw new Error('Cannot register extension without a name!');
            if (this.classDefinition.extensions[extension.name]) throw new Error('Cannot register «'+extension.name+'» extension, an extension with the same name was already registered before!');

            // store extension
            this.classDefinition.extensions[extension.name] = extension;


            // create accessor on the class
            this.classDefinitionn[extension.name] = function() {
                return new this.extensions[extension.name]({
                      parameters: sclice.call(arguments)
                    , alias: this.alias
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
