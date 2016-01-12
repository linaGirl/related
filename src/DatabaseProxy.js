(function() {
    'use strict';


    let log = require('ee-log');



    // there are only a handful of public methods
    // avilabele, dont expose more than needed!
    let publicMethods = new Set([
          'load'
        , 'createTransaction'
        , 'usePool'
        , 'get'
        , 'has'
        , 'set'
        , 'getUnproxiedDatabaseInstance'
    ]);








    // define the proxy class
    module.exports = {

        


        /**
         * let the user only set custom models, nothing else
         *
         * @param {object} database the database that is beeing proxied
         * @param {string} propertyName the name of the proxies property
         * @param {*} the value to set
         *
         * @returns {*} whatever is returned from the methods called
         */
        set(database, propertyName, value) {
            
            if (database.has(propertyName)) return database.set(propertyName, value);
            else throw new Error(`Cannot set the custom Model or property '${propertyName}' on the database!`);
        }









        /**
         * return entity constructors, public methods or undefined
         *
         * @param {object} database the database that is beeing proxied
         * @param {string} propertyName the name of the proxies property
         *
         * @returns {*} whatever is returned from the methods called
         */
        , get(database, propertyName) {

            if (database.has(propertyName)) return database.get(propertyName);
            else if (publicMethods.has(propertyName)) return database[propertyName].bind(database);
            else return undefined;
        }











        /**
         * return true only for entities
         *
         * @param {object} database the database that is beeing proxied
         * @param {string} propertyName the name of the proxies property
         *
         * @returns {boolean}
         */
        , has(database, propertyName) {
            return database.has(propertyName);
        }










         /**
         * trap the for in operator, we publish all columns, mappings, 
         * references and refenced bys
         *
         * @param {object} database the database that is beeing proxied
         * @param {string} propertyName the name of the proxies property
         *
         * @returns {iterator}
         */
        , enumerate(database) {
            return Array.from(database.avialableEntities);
        }











        /**
         * returns custom propery descriptors for all entites
         *
         * @param {object} database the database that is beeing proxied
         * @param {string} propertyName the name of the proxies property
         *
         * @returns {object}
         */
        , getOwnPropertyDescriptor(database, propertyName) {
            if (database.has(propertyName)) {

                return {
                      configurable: true
                    , writable: true
                    , value: database.get(propertyName)
                    , enumerable: true
                };
            }
            else return Reflect.getOwnPropertyDescriptor(database, propertyName);
        }











        /**
         * returns all model properties such as columns, mappings,
         * references and belong tos that are not a public methods
         * and are initialized
         *
         * @returns {array}
         */
        , ownKeys(database) {
            return Array.from(database.avialableEntities);
        }
    };
})();
