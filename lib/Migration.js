!function(){

    var   Class         = require('ee-class')
        , type          = require('ee-types')
        , log           = require('ee-log');



    module.exports = new Class({


        init: function(version) {
            if (!type.string(version)) throw new Error('Expecting a version string!');

            this.databases = [];
            this.schemas = [];
            this.dependecies = {};

            // remove .js from the filename
            this.version = version.replace('.js', '');
        }



        /**
         * creates a serializable representation of this migration
         */
        , serialize: function() {
            if (!type.string(this.version)) throw new Error('No migration version specified!');
            if (!type.string(this.description)) throw new Error('No migration description specified!');
            if (!type.function(this.up)) throw new Error('Missing the «up» migration method!');
            if (!type.function(this.down)) throw new Error('Missing the «down» migration method!');

            return {
                  version: this.version
                , dependecies: this.dependecies
                , description: this.description
                , up: this.parseMethod('up')
                , down: this.parseMethod('down')
                , createDatababase: this.databases
                , createSchema: this.schemas
            };
        }




        /**
         * retusn a proper serialized method ;)
         *
         * @param <string> methodff name
         */
        , parseMethod: function(name) {
            var method = /^\s*function\s*\(([^\)]*)\)\s*\{([^$]*)\}\s*$/gi.exec(this[name].toString());

            return {
                  arguments: method[1].split(',').map(function(arg) { return arg.trim();}).filter(function(arg) {return arg && arg.length;})
                , body: method[2].trim().replace(/[\t]+/gi, ' ')
                    .replace(/[\s]{2,}/gi, ' ')
                    .replace(/[\n]{2,}/gi, '\n')
                    .replace(/\s+,\s+/gi, ', ')
                    .replace(/\(\s+/gi, '(')
                    .replace(/\{\s+/gi, '{')
                    .replace(/\[\s+/gi, '[')
                    .replace(/\s+\)/gi, ')')
                    .replace(/\s+\]/gi, ']')
                    .replace(/\s+\}/gi, '}')
                    .replace(/\s+:/gi, ':')
            }
        }


        /** 
         * tells the migrator to do th eother migration first
         *
         * @param <string> moduleName
         * @param <string> semantic version
         */
        , dependsOn: function(moduleName, semanticVersion) {
            this.dependecies[moduleName] = semanticVersion;
        }




        /**
         * add a description for this migration
         *
         * @param <string> description
         */
        , describe: function(description) {
            this.description = description;
        }



        /**
         * tell the migration to create a database
         *
         * @param <String> name
         */
        , createDatababase: function(name) {
            this.databases.push(name);
        }



        /**
         * tell the migration to create a schema
         *
         * @param <String> name
         */
        , createSchema: function(name) {
            this.schemas.push(name);
        }
    });
}();
