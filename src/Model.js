(function() {
    'use strict';


    let Class               = require('ee-class');
    let type                = require('ee-types');
    let log                 = require('ee-log');

    let AsyncEventEmitter   = require('./AsyncEventEmitter');
    let QueryBuilder        = require('./QueryBuilder');
    let ModelSetInstance    = require('./ModelSetInstance');
    let ModelSetProxy       = require('./ModelSetProxy');





    /**
     * storage for the names pf all public methods
     * that should be retuned by the proxy
     *
     * the list can be extended by calling 
     * Model.addPublicMethod(propertyName);
     */
    let publicMethods = new Set([
          'has'
        , 'hasColumn'
        , 'set'
        , 'get'
        , 'getName'
        , 'isDirty'
        , 'isNew'
        , 'populateFromDatabase'
    ]);






        
    // the basic model definition
    class Model extends AsyncEventEmitter {




        /**
         * static method for adding another
         * public method that should be exposed to
         * the user
         *
         * @param {string} propertyName
         */
        static addPublicMethod(propertyName) {
            publicMethods.add(propertyName);
        }









        /**
         * stets the class up
         *
         */
        constructor(options) {
            super(options);

        }




























        /**
         * returnes if the model has a property with the
         * given name
         *
         * @param {string} propertyName
         *
         * @returns {boolean} true if the model has the property
         */
        has(propertyName) {
            return this.properties.has(propertyName);
        }








        /**
         * returnes if the model has a column with the
         * given name
         *
         * @param {string} propertyName
         *
         * @returns {boolean} true if the model has the column
         */
        hasColumn(propertyName) {
            return this.properties.has(propertyName) && this.properties.get(propertyName).kind === 'column';
        }









        /**
         * sets a property on the model
         *
         * @param {string} propertyName
         * @param {*} the value to set
         */
        set(propertyName, value) {

            // check if it is actually a propery
            if (this.has(propertyName)) {
                let property = this.properties.get(propertyName);


                // dont overwrite mappings and reverenceBy
                // add the values to the respective sets
                switch (property.kind) {

                    case 'column':
                        if (!this.values) this.values = new Map();

                        // dirty status
                        if (!this.values.has(propertyName) || this.values.get(propertyName) !== value) this.setDrity();


                        // store
                        this.values.set(propertyName, value);
                        break;




                    case 'mapping':
                        if (!this.mappings) this.mappings = new Map();

                        if (type.array(value) || type.set(value) || type.weakSet(value)) {
                            this.setDrity();

                            let set = this.createMappingSet(propertyName);

                            value.forEach((val) => {
                                set.add(val);
                            });

                            // replace existing
                            this.mappings.set(propertyName, set);

                            // return to the user
                            return set;
                        }
                        else throw new Error(`Cannot set value for mapping '${propertyName}' on model '${this.getName()}', only arrays, sets and weak sets are accepted. Got type '${type(value)}'!`);
                        break;





                    case 'referenceBy':
                        if (!this.referenceBys) this.referenceBys = new Map();

                        if (type.array(value) || type.set(value) || type.weakSet(value)) {
                            this.setDrity();

                            let set = this.createReferenceBySet(propertyName);

                            value.forEach((val) => {
                                set.add(val);
                            });

                            // replace existing
                            this.referenceBys.set(propertyName, set);

                            // return to the user
                            return set;
                        }
                        else throw new Error(`Cannot set value for reference by '${propertyName}' on model '${this.getName()}', only arrays, sets and weak sets are accepted. Got type '${type(value)}'!`);
                        break;





                    case 'reference':
                        if (!this.references) this.references = new Map();


                        if (type.object(value) && (value instanceof Model || value instanceof QueryBuilder)) {
                            this.setDrity();

                            this.references.set(propertyName, value);
                        }
                        else throw new Error(`Cannot set value for reference '${propertyName}' on model '${this.getName()}', only models or queries are accepted. Got type '${type(value)}'!`);
                        break;




                    default:
                        throw new Error(`Cannot set the property '${propertyName}' on the '${this.getName()}' model, the property is registerd but of an unknown kind '${property.kind}'!`);
                }
            }
            else throw new Error(`Cannot set the property '${propertyName}' on the '${this.getName()}' model, a property with that name does not exist!`);
        }












        /**
         * returns the value of a property 
         *
         * @param {string} §
         *
         * @returns {*}
         */
        get(propertyName) {


            // check if it is actually a propery
            if (this.has(propertyName)) {
                let property = this.properties.get(propertyName);


                // dont overwrite mappings and reverenceBy
                // add the values to the respective sets
                switch (property.kind) {

                    case 'column':

                        // return
                        return this.values.get(propertyName);




                    case 'mapping':
                        if (!this.mappings) this.mappings = new Map();
                        if (!this.mappings.has(propertyName)) this.mappings.set(propertyName, this.createMappingSet(propertyName));

                        // return
                        return this.mappings.get(propertyName);




                    case 'referenceBy':
                        if (!this.referenceBys) this.referenceBys = new Map();
                        if (!this.referenceBys.has(propertyName)) this.referenceBys.set(propertyName, this.createReferenceBySet(propertyName));

                        // return
                        return this.referenceBys.get(propertyName);




                    case 'reference':
                        if (!this.references) this.references = new Map();

                        // return
                        return this.references.has(propertyName) ? this.references.get(propertyName) : null;




                    default:
                        throw new Error(`Cannot set the property '${propertyName}' on the '${this.getName()}' model, the property is registerd but of an unknown kind '${property.kind}'!`);
                }
            }
            else throw new Error(`Cannot get the property '${propertyName}' on the '${this.getName()}' model, a property with that name does not exist!`);
        }












        /**
         * adds values the orm loaded from the database
         * resets the dirty flag
         *
         * @param {object} values
         */
        populateFromDatabase(values) {
            if (type.object(values)) {
                Object.keys(values).forEach((key) => {
                    this.set(key, values[key]);
                });


                // reset dirty flag
                this.setDrity(false);
                this.setNew(false);

                return this;
            }
            else if (!type.null(values) && !type.undefined(values)) throw new Error(`Cannot set values from the db on the '${this.getName()}' model, expected object, null or undefined, got '${type(values)}'!`);
        }











        /**
         * creates a new set for a mapping 
         *
         * @param {string} propertyName
         *
         * @returns {object} set
         */
        createMappingSet(propertyName) {

            // first check if there is a custom
            // constructor for this property
            if (this.mappingConstrutors.has(propertyName)) return new Proxy(new (this.mappingConstrutors.get(propertyName))(), ModelSetProxy);
            else {

                // the constructor was not yet created
                // do this now!
                let definition = this.getDefinition();


                // check if the property exists
                if (definition.hasProperty(propertyName)) {

                    // check if the property is a mapping
                    if (definition.getPropertyType(propertyName) === 'mapping') {


                        // create the custom class constructor
                        let SetConstructor = new ModelSetInstance({
                              database      : this.database
                            , definition    : definition.getProperty(propertyName)
                            , kind          : 'mapping' 
                        });


                        // add to storage
                        this.mappingConstrutors.set(propertyName, SetConstructor);


                        // return
                        return new Proxy(new SetConstructor(), ModelSetProxy);
                    }
                    else throw new Error(`Cannot create the mapping set '${propertyName} on the model '${this.getName()}, expected the type 'mapping', got the type '${definition.getPropertyType(propertyName)}' instead!`);
                    
                }
                else throw new Error(`Cannot create the mapping set '${propertyName} on the model '${this.getName()}, the property does not exist!`);
            }
        }










        /**
         * creates a new set for a referenced by entity
         *
         * @param {string} propertyName
         *
         * @returns {object} set
         */
        createReferenceBySet(propertyName) {
            
            // first check if there is a custom
            // constructor for this property
            if (this.referenceByConstrutors.has(propertyName)) return new (this.referenceByConstrutors.get(propertyName))();
            else {

                // the constructor was not yet created
                // do this now!
                let definition = this.getDefinition();


                // check if the property exists
                if (definition.hasProperty(propertyName)) {

                    // check if the property is a mapping
                    if (definition.getPropertyType(propertyName) === 'referenceBy') {


                        // create the custom class constructor
                        let SetConstructor = new ModelSetInstance({
                              database      : this.database
                            , definition    : definition.getProperty(propertyName)
                            , kind          : 'referenceBy' 
                        });


                        // add to storage
                        this.referenceByConstrutors.set(propertyName, SetConstructor);


                        // return
                        return new SetConstructor();
                    }
                    else throw new Error(`Cannot create the reference by set '${propertyName} on the model '${this.getName()}, expected the type 'referenceBy', got the type '${definition.getPropertyType(propertyName)}' instead!`);
                    
                }
                else throw new Error(`Cannot create the reference by set '${propertyName} on the model '${this.getName()}, the property does not exist!`);
            }
        }













        /**
         * flags if the model has changes
         *
         * @returns {boolean}
         */
        isDirty() {
            return this.$isDirty;
        }










        /**
         * marks the model as dirty
         */
        setDrity(isDirty) {
            this.$isDirty = type.boolean(isDirty) ? isDirty : true;
        }











        /**
         * flags if the model is new or from the database
         *
         * @returns {boolean}
         */
        isNew() {
            return this.$isNew;
        }










        /**
         * marks the model as new
         */
        setNew(isNew) {
            this.$isNew = type.boolean(isNew) ? isNew : true;
        }









        /**
         * returns the name of the current model
         *
         * @returns {string}
         */
        getName() {
            return this.name;
        }








        /**
         * cheks if a method on this model is a public method
         *
         * @param {string} propertyName
         *
         * @returns {boolean}
         */
        hasPublicMethod(propertyName) {
            return publicMethods.has(propertyName);
        }










        /**
         * returns the defnition of the model
         *
         * @returns {onject} defintion
         *
         */
        getDefinition() {
            return this.definition;
        }
    }












    // flags if the model is new or loaded
    // from the databse
    Model.prototype.$isNew = true;

        
    // flags if the model is dirty 
    // aka a value has changed
    Model.prototype.$isDirty = true;








    // export
    module.exports = Model;

})();
