(function() {
    'use strict';


    let log = require('ee-log');




    // define the proxy class
    module.exports = {

        


        /**
         * trap for the get operation rerutes some calls
         * to another storage object on the model
         *
         * @param {object} model the model that is beeing proxied
         * @param {string} propertyName the name of the proxies property
         * @param {*} the value to set
         *
         * @returns {*} whatever is returned from the methods called
         */
        set(model, propertyName, value) {
            
            // we're differentiating between properties that
            // are model properties as defined in th model class
            // and generic properties. the setter will always
            // route model properties to the model value storage
            // and never to the model itself
            if (model.has(propertyName)) return model.set(propertyName, value);
            else if (!model.hasPublicMethod(propertyName)) return model.setCustomProperty(propertyName, value);
            else throw new Error(`Cannot set the '${propertyName} property, its method of the model and cannot be replaced!`);
        }








        /**
         * trap the getter, we're returning values from the 
         * storage and not the model itself
         *
         * @param {object} model the model that is beeing proxied
         * @param {string} propertyName the name of the proxies property
         *
         * @returns {*} whatever is returned from the methods called
         */
        , get(model, propertyName) {

            // check if the model has a property with the 
            // given name and the property is not a public 
            // method
            if (model.hasPublicMethod(propertyName)) return model[propertyName].bind(model);
            else if (model.has(propertyName)) return model.get(propertyName);
            else if (model.hasCustomProperty(propertyName)) return model.getCustomProperty(propertyName);
            else return undefined;
        }











        /**
         * trap the in operator, we publish all columns, mappings, 
         * references and refenced bys
         *
         * @param {object} model the model that is beeing proxied
         * @param {string} propertyName the name of the proxies property
         *
         * @returns {boolean}
         */
        , has(model, propertyName) {
            return model.has(propertyName);
        }










         /**
         * trap the for in operator, we publish all columns, mappings, 
         * references and refenced bys
         *
         * @param {object} model the model that is beeing proxied
         * @param {string} propertyName the name of the proxies property
         *
         * @returns {iterator}
         */
        , enumerate(model) {
            return model.properties[Symbol.iterator];
        }











        /**
         * returns custom propery descriptors for all model properties 
         * such as columns, mappings, references and belong tos that  
         * are not a public methods
         *
         * @param {object} model the model that is beeing proxied
         * @param {string} propertyName the name of the proxies property
         *
         * @returns {object}
         */
        , getOwnPropertyDescriptor(model, propertyName) {
            if (model.has(propertyName)) {

                let value = (model.hasColumn(propertyName) ? model.get(propertyName) : (model.propertyIsInitialized(propertyName) ? model.get(propertyName) : undefined));

                return {
                      configurable: true
                    , writable: true
                    , value: value
                    , enumerable: true
                };
            }
            else if (model.hasCustomProperty(propertyName)) {
                return {
                      configurable: true
                    , writable: true
                    , value: model.getCustomProperty(propertyName)
                    , enumerable: true
                };
            }
            else return undefined;//Reflect.getOwnPropertyDescriptor(model, propertyName);
        }












        /**
         * returns all model properties such as columns, mappings,
         * references and belong tos that are not a public methods
         * and are initialized
         *
         * @returns {array}
         */
        , ownKeys(model) {
            return Array.from(model.$properties.keys()).concat(model.$customProperties ? Array.from(model.$customProperties.keys()) : []).filter(propertyName => {
                return !model.hasPublicMethod(propertyName) && (model.propertyIsInitialized(propertyName) || model.hasCustomProperty(propertyName));
            });
        }
    };
})();
