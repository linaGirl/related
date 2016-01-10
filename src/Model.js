(function() {
    'use strict';


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
        , 'columns'
        , 'mappings'
        , 'references'
        , 'belongTos'
        , 'properties'
        , 'prepare'
        , 'getUnproxiedModelInstance'
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
         * @param {object} values
         */
        constructor(values) {
            super();



            if (type.object(values)) {
                
                // got initial values
                Object.keys(values).forEach((key) => {
                    this.set(key, values[key]);
                });
            }
            else if (type.map(values)) {

                // got map values
                values.forEach((value, key) => {
                    this.set(key, value);
                });
            }
            else if (!type.undefined(values) && !type.null(values)) {
                throw new Error(`When instantiating the '${this.name}' model, an object, a map, null or undefined can passed to the constructor, got '${type(values)}' instead!`);
            }
        }












        /**
         * prepares the model and all oonnected entities
         * executes all items added as query and returns 
         * the status. may be invoked by the user, but is
         * normally invoked by the save() method
         *
         * @param {object*} transaction optional 
         *
         * @returns {promise}
         */
        prepare(transaction) {

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
            return this.$properties.has(propertyName);
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
            return this.definition.columns.has(propertyName);
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
                let property = this.$properties.get(propertyName);


                // dont overwrite mappings and reverenceBy
                // add the values to the respective sets
                switch (property.kind) {

                    case 'column':
                        this.createStorageMap('$values');

                        // dirty status
                        if (!this.$values.has(propertyName) || this.$values.get(propertyName) !== value) this.setDirty();


                        // store
                        this.$values.set(propertyName, value);
                        break;




                    case 'mapping':
                        this.createStorageMap('$mappings');

                        if (type.array(value) || type.set(value)) {
                            this.setDirty();

                            let set = this.createMappingSet(propertyName);

                            value.forEach((val) => {
                                set.add(val);
                            });

                            // replace existing
                            this.$mappings.set(propertyName, set);

                            // return to the user
                            return set;
                        }
                        else throw new Error(`Cannot set value for mapping '${propertyName}' on model '${this.getName()}', only arrays and sets are accepted. Got type '${type(value)}'!`);
                        break;





                    case 'belongsTo':
                        this.createStorageMap('$belongTos');

                        if (type.array(value) || type.set(value)) {
                            this.setDirty();

                            let set = this.createBelongsToSet(propertyName);

                            value.forEach((val) => {
                                set.add(val);
                            });

                            // replace existing
                            this.$belongTos.set(propertyName, set);

                            // return to the user
                            return set;
                        }
                        else throw new Error(`Cannot set value for belongs to '${propertyName}' on model '${this.getName()}', only arraysand  sets are accepted. Got type '${type(value)}'!`);
                        break;





                    case 'reference':

                        if (type.object(value)) {
                            if (value instanceof this.database.getModelContructor(propertyName)) {
                                this.createStorageMap('$referenceModels');
                                this.$referenceModels.set(propertyName, value);

                            }
                            else if (value instanceof QueryBuilder) {
                                this.createStorageMap('$referenceQueries');
                                this.$referenceQueries.set(propertyName, value);
                                
                            }
                            else throw new Error(`Cannot set value for reference '${propertyName}' on model '${this.getName()}', only model instances of the '${propertyName}' entitiy or a querybuidler are acceptable!`);

                            // is now dirty!
                            this.setDirty();
                        }
                        else if (type.null(value)) {

                            // make sure null will be set!
                            this.set(this.getDefinition().references.get(propertyName).column.name, null);

                            // remove models & queries for this reference
                            if (this.$referenceModels && this.$referenceModels.has(propertyName)) this.$referenceModels.delete(propertyName);
                            if (this.$referenceQueries && this.$referenceQueries.has(propertyName)) this.$referenceQueries.delete(propertyName);
                        }
                        else throw new Error(`Cannot set value for reference '${propertyName}' on model '${this.getName()}', only null, models or queries are accepted. Got type '${type(value)}'!`);
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
                let property = this.$properties.get(propertyName);


                // dont overwrite mappings and reverenceBy
                // add the values to the respective sets
                switch (property.kind) {

                    case 'column':
                        this.createStorageMap('$values');

                        // return
                        return this.$values.get(propertyName);




                    case 'mapping':
                        this.createStorageMap('$mappings');
                        if (!this.$mappings.has(propertyName)) this.$mappings.set(propertyName, this.createMappingSet(propertyName));

                        // return
                        return this.$mappings.get(propertyName);




                    case 'belongsTo':
                        this.createStorageMap('$belongTos');
                        if (!this.$belongTos.has(propertyName)) this.$belongTos.set(propertyName, this.createBelongsToSet(propertyName));

                        // return
                        return this.$belongTos.get(propertyName);




                    case 'reference':

                        // return onyl models, ignore thee queries
                        return this.$referenceModels && this.$referenceModels.has(propertyName) ? this.$referenceModels.get(propertyName) : null;




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
                this.setDirty(false);
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
            if (this.mappingConstructors.has(propertyName)) return new Proxy(new (this.mappingConstructors.get(propertyName))(), ModelSetProxy);
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
                        this.mappingConstructors.set(propertyName, SetConstructor);

                        // return
                        return new Proxy(new SetConstructor(), ModelSetProxy);
                    }
                    else throw new Error(`Cannot create the mapping set '${propertyName} on the model '${this.getName()}, expected the type 'mapping', got the type '${definition.getPropertyType(propertyName)}' instead!`);
                    
                }
                else throw new Error(`Cannot create the mapping set '${propertyName} on the model '${this.getName()}, the property does not exist!`);
            }
        }










        /**
         * creates a new set for a entitiy this entitiy belongs to
         *
         * @param {string} propertyName
         *
         * @returns {object} set
         */
        createBelongsToSet(propertyName) {
            
            // first check if there is a custom
            // constructor for this property
            if (this.belongsToConstructors.has(propertyName)) return new (this.belongsToConstructors.get(propertyName))();
            else {

                // the constructor was not yet created
                // do this now!
                let definition = this.getDefinition();


                // check if the property exists
                if (definition.hasProperty(propertyName)) {

                    // check if the property is a mapping
                    if (definition.getPropertyType(propertyName) === 'belongsTo') {


                        // create the custom class constructor
                        let SetConstructor = new ModelSetInstance({
                              database      : this.database
                            , definition    : definition.getProperty(propertyName)
                            , kind          : 'belongsTo' 
                        });


                        // add to storage
                        this.belongsToConstructors.set(propertyName, SetConstructor);


                        // return
                        return new Proxy(new SetConstructor(), ModelSetProxy);
                    }
                    else throw new Error(`Cannot create the belongs to set '${propertyName} on the model '${this.getName()}, expected the type 'belongsTo', got the type '${definition.getPropertyType(propertyName)}' instead!`);
                    
                }
                else throw new Error(`Cannot create the belongs to set '${propertyName} on the model '${this.getName()}, the property does not exist!`);
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
        setDirty(isDirty) {
            Object.defineProperty(this, '$isDirty', {value: (type.boolean(isDirty) ? isDirty : true), writable: true, configurable: true});
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
            Object.defineProperty(this, '$isNew', {value: (type.boolean(isNew) ? isNew : true), writable: true, configurable: true});
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










        /**
         * creates a map with the specific name on this 
         * object, but only if it doesn't exist already
         *
         * @param {string} mapName
         */
        createStorageMap(mapName) {
            if (type.undefined(this[mapName])) Object.defineProperty(this, mapName, {value:new Map(), configurable: true});
            else if (!type.map(this[mapName])) throw new Error(`Cannot create map with the name '${mapName}' on the model '${this.name}', a property with this name and the type '${type(this[mapName])}' exists already!`);
        }







         /**
         * retutns if referencing property has been initialized
         *
         * @param {string} propertyName
         *
         * @returns {boolean}
         */
        propertyIsInitialized(propertyName) {
            if (this.has(propertyName)) {
                let property = this.$properties.get(propertyName);

                // redirect to the appropriate method
                switch (property.kind) {

                    case 'mapping':
                        return this.mappingIsInitialized(propertyName);

                    case 'belongsTo':
                        return this.belongsToIsInitialized(propertyName);

                    case 'reference':
                        return this.referenceIsInitialized(propertyName);

                    case 'column':
                        return this.valueIsInitialized(propertyName);


                    default:
                        throw new Error(`Cannot check the property '${propertyName}' on the '${this.getName()}' model, the property is registerd but of an invalid kind '${property.kind}'!`);
                }
            }
            else throw new Error(`Cannot check the property '${propertyName}' on the '${this.getName()}' model, a property with that name does not exist!`);
        }







        /**
         * returns the model withtout the proxy
         * only used for testing!
         *
         * @returns {object} this
         */
        getUnproxiedModelInstance() {
            return this;
        }








        /**
         * retutns if a mapping has been initialized
         *
         * @param {string} propertyName
         *
         * @returns {boolean}
         */
        valueIsInitialized(propertyName) {
            return !!this.$values && this.$values.has(propertyName);
        }



        /**
         * retutns if a mapping has been initialized
         *
         * @param {string} propertyName
         *
         * @returns {boolean}
         */
        mappingIsInitialized(propertyName) {
            return !!this.$mappings && this.$mappings.has(propertyName);
        }



        /**
         * retutns if a reference has been initialized
         *
         * @param {string} propertyName
         *
         * @returns {boolean}
         */
        referenceIsInitialized(propertyName) {
            return !!this.$referenceModels && this.$referenceModels.has(propertyName);
        }



        /**
         * retutns if a belongs to has been initialized
         *
         * @param {string} propertyName
         *
         * @returns {boolean}
         */
        belongsToIsInitialized(propertyName) {
            return !!this.$belongTos && this.$belongTos.has(propertyName);
        }








        /**
         * lets the user iterate over the column names
         *
         * @returns {iterable}
         */
        columns() {
            return this.getDefinition().columns.keys();
        }





        /**
         * lets the user iterate over the mapping names
         *
         * @returns {iterable}
         */
        mappings() {
            return this.getDefinition().mappings.keys();
        }





        /**
         * lets the user iterate over the reference names
         *
         * @returns {iterable}
         */
        references() {
            return this.getDefinition().references.keys();
        }





        /**
         * lets the user iterate over the belongsTo names
         *
         * @returns {iterable}
         */
        belongTos() {
            return this.getDefinition().belongTos.keys();
        }





        /**
         * lets the user iterate over the properties
         *
         * @returns {iterable}
         */
        properties() {
            let entryIterator = this.$properties.entries();


            return {
                next() {
                    let status = entryIterator.next();

                    if (!status.done) {

                        return {
                            value: {
                                  key       : status.value[0]
                                , value     : status.value[1].kind
                            }
                            , done: false
                        };
                    }
                    else return {done: true};
                }


                , [Symbol.iterator]() {
                    return this;
                }
            };
        }





        /**
         * lets the user iterate over the columns and values
         *
         * @returns {Iterable}
         */
        [Symbol.iterator]() {
            let keyIterator = this.getDefinition().columns.keys();

            return {
                next: function() {
                    let status = keyIterator.next();

                    if (!status.done) {

                        return {
                            value: {
                                  key       : status.value
                                , value     : this.get(status.value)
                            }
                            , done: false
                        };
                    }
                    else return {done: true};
                }.bind(this)
            };
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
