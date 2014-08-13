!function(){

    var   Class         = require('ee-class')
        , async         = require('ee-async')
        , EventEmitter  = require('ee-event-emitter')
        , type          = require('ee-types')
        , log           = require('ee-log')
        , argv          = require('ee-argv')
        , RelatingSet   = require('./RelatingSet')
        , debug         = argv.has('dev-orm');




    module.exports = new Class({

        init: function(options) {
            // the model to inherit from
            this.baseModel = options.baseModel;

            // the orm
            this.orm = options.orm;

            // the model definition
            this.definition = options.definition;

            // access to the current database
            this.getDatabase = options.getDatabase;

            // the current db name
            this.databaseName = this.definition.getDatabaseName();

            // configurations
            // maps of mappings, references and belonsto
            this.mappingMap = options.mappingMap;
            this.belongsToMap = options.belongsToMap;
            this.referenceMap = options.referenceMap;

            // columns
            this.columns = options.columns;

            // generic accessors (double used names)
            this._genericAccessors = options.genericAccessors;

            // extensions registered with the orm
            this._extensions = options.extensions;

            // create the model
            this.Model = this.build();

            return this.Model;
        }



        /*
         * the build method builds the classDefinition required for the model
         */
        , build: function() {
            var classDefinition;


            classDefinition = {
                inherits: this.baseModel

                , init: function init(options) {
                    if (init.super) init.super.call(this, options);
                }

                , _genericAccessors: Class(this._genericAccessors)

                , _extensionEventListeners: Class({})
            };

            // apply extensions
            this.applyExtensions(classDefinition);

            // define columns for the  current class
            this.addColumnAccessors(classDefinition);

            // return class
            return new Class(classDefinition);
        }


        /*
         * gets all extensions that should be used on this model and applies them 
         * to this model
         *
         * @param <Object> class deinfition
         */
        , applyExtensions: function(classDefinition) {
            var extensions = this._extensions.getModelExtensions(this.definition);

            if (debug) log.info('Found %s extension(s) for the «%s» model ..', extensions.length, this.definition.tableName);

            extensions.forEach(function(extension) {
                // collect mehotds
                if (type.function(extension.applyModelMethods)) extension.applyModelMethods(this.definition, classDefinition);

                // check for event listeners
                extension.getModelEventListeners().forEach(function(listener) {
                    if (debug) log.debug('Registering «%s» extension event on the «%s» model ...', listener.event, this.definition.tableName);

                    if (!classDefinition._extensionEventListeners[listener.event]) classDefinition._extensionEventListeners[listener.event] = [];
                    classDefinition._extensionEventListeners[listener.event].push(listener.listener);
                }.bind(this));
            }.bind(this));
        }


        /*
         * the addColumnAccessors method adds the colum accessors to the class
         *
         * @param <Object> class deinfition
         */
        , addColumnAccessors: function(classDefinition) {
            Object.keys(this.definition.columns).forEach(function(columnName){
                var column = this.definition.columns[columnName];

                // add mapping accesors
                this.addColumnMappings(classDefinition, column);

                // add belongsto accessors
                this.addColumnBelonging(classDefinition, column);

                // add column (reference) accessors
                this.addColumn(classDefinition, column);

                // th eclass needs to know what a column represents
                classDefinition._columns = Class(this.columns);
            }.bind(this));

            // generic resource access
            this.addGenericAccessors(classDefinition);
        }





        , addGenericAccessors: function(classDefinition) {
            var thisContext = this;

             // generic accessor method for mappings
            classDefinition.getMapping = {
                value: function(mappingName) {
                    if (thisContext.mappingMap[mappingName]) {
                        var mappingId = thisContext.mappingMap[mappingName].name;

                        // create referencing set only when used
                        if (!this._mappings[mappingId]) {
                            this._mappings[mappingId] = new RelatingSet({
                                  orm:          thisContext.orm
                                , definition:   thisContext.mappingMap[mappingName].definition
                                , column:       thisContext.mappingMap[mappingName].column
                                , related:      this
                                , database:     thisContext.databaseName
                                , getDatabase:  thisContext.getDatabase
                                , isMapping:    true
                            });

                            this._mappings[mappingId].on('change', this._setChanged.bind(this));
                        }

                        return this._mappings[mappingId];                     
                    }
                    else throw new Error('Mapping via «'+mappingName+'» on entity «'+thisContext.definition.name+'» doesn\'t exist!');
                }
            };

            // generic accessor method for belongTo
            classDefinition.getBelongsTo = {
                value: function(belongingName){
                    if (thisContext.belongsToMap[belongingName]) {
                        var belongsToId = thisContext.belongsToMap[belongingName].name;

                        // create referencing set only when used
                        if (!this._belongsTo[belongsToId]) {
                            this._belongsTo[belongsToId] = new RelatingSet({
                                  orm:          thisContext.orm
                                , definition:   thisContext.belongsToMap[belongingName].definition
                                , column:       thisContext.belongsToMap[belongingName].column
                                , related:      this
                                , database:     thisContext.databaseName
                                , getDatabase:  thisContext.getDatabase
                                , isMapping:    false
                            });

                            this._belongsTo[belongsToId].on('change', this._setChanged.bind(this));
                        }

                        return this._belongsTo[belongsToId];                      
                    }
                    else throw new Error('Belongs to «'+belongingName+'» on entity «'+thisContext.definition.name+'» doesn\'t exist!');
                }
            };


            // generic accessor method for reference
            classDefinition.getReference = {
                value: function(referenceName){
                    if (thisContext.referenceMap[referenceName]) {                      
                        return this._references[referenceName];                     
                    }
                    else throw new Error('Reference on «'+referenceName+'» on entity «'+thisContext.definition.name+'» doesn\'t exist!');
                }
            };

            classDefinition.setReference = {
                value: function(referenceName, newReferenceModel, existing){
                    if (thisContext.referenceMap[referenceName]) {
                        if (!existing && this._references[referenceName] !== newReferenceModel) {
                            this._changedReferences.push(referenceName);    
                            this._references[referenceName] = newReferenceModel;
                            this._setChanged();
                        }
                    }
                    else throw new Error('Reference on «'+referenceName+'» on entity «'+thisContext.definition.name+'» doesn\'t exist!');
                }
            };
        }



        /*
         * the addColumn method adds the colum belongs to accessors to the class
         *
         * @param <Object> class definition
         * @param <Object> column definition
         */
        , addColumn: function(classDefinition, column) {
            var   definition = {}
                , columnName = column.name
                , referenceName
                , referenceDefinition;


            if (column.referencedModel) {
                this.referenceMap[columnName] = column;

                if (!column.useGenericAccessor) {
                    referenceName = column.aliasName || column.referencedModel.name;

                    this.columns[referenceName] = {
                          type          : 'reference'
                        , column        : column
                        , definition    : column.referencedModel
                    };

                    referenceDefinition = {enumerable: true};


                    referenceDefinition.get = function(){
                        return this._references[referenceName];
                    };

                    referenceDefinition.set = function(newValue){
                        if (this._references[referenceName] !== newValue) {
                            this._changedReferences.push(referenceName);
                            this._changedValues.push(columnName);
                            this._references[referenceName] = newValue;
                            this._setChanged();
                        }
                    };

                    classDefinition[referenceName] = referenceDefinition;
                }
                else if (column.useGenericAccessor) this.storeGenericAccessor(columnName, this.referenceMap[columnName]);
            }
            else {
                definition.enumerable = true;
                this.columns[columnName] = {
                      type      : 'scalar'
                    , column    : column
                };
            }

            definition.get = function(){
                return this._values[columnName];
            };

            definition.set = function(value){
                if (this._values[columnName] !== value) {
                    this._changedValues.push(columnName);
                    this._values[columnName] = value;
                    this._setChanged();
                }
            };

            classDefinition[column.name] = definition;
        }



        /*
         * the addColumnBelonging method adds the colum belongs to accessors to the class
         *
         * @param <Object> class definition
         * @param <Object> column definition
         */
        , addColumnBelonging: function(classDefinition, column) {
            var thisContext = this;

            if (column.belongsTo){
                column.belongsTo.filter(function(belongsTo){

                    // store information about all mappings
                    this.belongsToMap[belongsTo.model.name] = {
                          column        : column
                        , definition    : belongsTo
                        , name          : belongsTo.aliasName || belongsTo.model.name
                    };

                    // store info about generic accessors
                    if (belongsTo.useGenericAccessor) this.storeGenericAccessor(belongsTo.name, this.belongsToMap[belongsTo.model.name]);

                    return !belongsTo.useGenericAccessor;
                }.bind(this)).forEach(function(belongsTo) {
                    var relationName = belongsTo.aliasName || belongsTo.model.name;

                    this.columns[relationName] = {
                          type          : 'belongsTo'
                        , column        : column
                        , definition    : belongsTo
                    };

                    // getter
                    classDefinition[relationName] = {
                          enumerable: true
                        , get: function() {
                            // create referencing set only when used
                            if (!this._belongsTo[relationName]) {
                                this._belongsTo[relationName] = new RelatingSet({
                                      orm:              thisContext.orm
                                    , definition:       belongsTo
                                    , column:           column
                                    , related:          this
                                    , database:         thisContext.databaseName
                                    , isMapping:        false
                                });
                            }

                            return this._belongsTo[relationName];
                        }
                    };
                }.bind(this));
            }
        }



        /*
         * the addColumnMappings method adds the colum mapping accessors to the class
         *
         * @param <Object> class definition
         * @param <Object> column definition
         */
        , addColumnMappings: function(classDefinition, column) {
            var thisContext = this;

            if (column.mapsTo) {
                column.mapsTo.filter(function(mapping) {

                    // store information about all mappings
                    this.mappingMap[mapping.via.model.name] = {
                          column        : column
                        , definition    : mapping
                        , name          : mapping.aliasName || mapping.model.name
                    };

                    // store info about generic accessors
                    if (mapping.useGenericAccessor) this.storeGenericAccessor(mapping.name, this.mappingMap[mapping.via.model.name]);

                    return !mapping.useGenericAccessor;
                }.bind(this)).forEach(function(mapping) {
                    var mappingName = mapping.aliasName || mapping.model.name;

                    this.columns[mappingName] = {
                          type          : 'mapping'
                        , column        : column
                        , definition    : mapping
                    };

                    // getter
                    classDefinition[mappingName] = {
                          enumerable: true
                        , get: function() {
                            // create referencing set only when used
                            if (!this._mappings[mappingName]) {
                                this._mappings[mappingName] = new RelatingSet({
                                      orm:              thisContext.orm
                                    , definition:       mapping
                                    , column:           column
                                    , related:          this
                                    , database:         thisContext.databaseName
                                    , isMapping:        true
                                    , getDatabase:      thisContext.getDatabase
                                });
                            }

                            return this._mappings[mappingName];
                        }
                    };
                }.bind(this));
            }
        }



        /*
         * the storeGenericAccessor method stores which columns are using a generic accessp
         *
         * @param <string> colum name
         * @param <object> a description of the relation of the column
         *
         */
        , storeGenericAccessor: function(targetModelName, config){
            if (!this._genericAccessors[targetModelName]) this._genericAccessors[targetModelName] = [];
            this._genericAccessors[targetModelName].push(config);
        }
    });
}();
