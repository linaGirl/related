(function() {
    'use strict';


    let log = require('ee-log');
    let type = require('ee-types');




    // define the proxy class
    module.exports = {

        


        /**
         * trap for the get operation. if the propertyName is numeric
         * return the irem at position x of the set
         *
         * @param {object} set the set that is beeing proxied
         * @param {string} propertyName the name of the proxies property
         * @param {*} the value to set
         *
         * @returns {*} whatever is returned from the methods called
         */
        set(set, propertyName, value) {
            
            // catch the numeric properties
            if (type.number(propertyName)) return set.set(propertyName, value);
            if (type.string(propertyName) && !/[^0-9]/.test(propertyName)) return set.set(parseInt(propertyName, 10), value);
            else return Reflect.set(set, propertyName, value);
        }








        /**
         * trap the getter, if the propertyName is numeric
         * set the irem at position x of the set
         *
         * @param {object} set the set that is beeing proxied
         * @param {string} propertyName the name of the proxies property
         *
         * @returns {*} whatever is returned from the methods called
         */
        , get(set, propertyName) {

             // catch the numeric properties
            if (type.number(propertyName)) return set.get(propertyName);
            if (type.string(propertyName) && !/[^0-9]/.test(propertyName)) return set.get(parseInt(propertyName, 10));
            else return Reflect.get(set, propertyName);
        }






        




        /**
         * trap the in operator, publish all models
         *
         * @param {object} set the set that is beeing proxied
         * @param {string} propertyName the name of the proxies property
         *
         * @returns {boolean}
         */
        , has(set, propertyName) {
            return set.has(propertyName);
        }










         /**
         * trap the for in operator, publish all models
         *
         * @param {object} set the set that is beeing proxied
         * @param {string} propertyName the name of the proxies property
         *
         * @returns {iterator}
         */
        , enumerate(set) {
            return set.models[Symbol.iterator];
        }










        /**
         * returns custom propery descriptors for all models that were added
         * to the set
         *
         * @param {object} model the model that is beeing proxied
         * @param {string} propertyName the name of the proxies property
         *
         * @returns {object}
         */
        , getOwnPropertyDescriptor(set, propertyName) {
            if (type.number(propertyName) || type.string(propertyName) && !/[^0-9]/.test(propertyName)) {
                return {
                      configurable: true
                    , writable: true
                    , value: set.get(propertyName)
                    , enumerable: true
                };
            }
            else return Reflect.getOwnPropertyDescriptor(set, propertyName);
        }











        /**
         * returns properties for all models that were added to the set
         * 
         * @returns {array}
         */
        , ownKeys(set) {
            return Array.apply(null, {length: set.length}).map((v, i) => i+'');
        }
    };
})();
