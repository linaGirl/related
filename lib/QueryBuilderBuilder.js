!function(){

    var   Class         = require('ee-class')
        , log           = require('ee-log')
        , argv          = require('ee-argv')
        , type          = require('ee-types')
        , QueryBuilder  = require('./QueryBuilder')
        , Resource      = require('./Resource')
        , debug         = argv.has('dev-orm');




    module.exports = new Class({
        
        init: function(options){
            this.queryBuilders      = options.queryBuilders;
            this.definition         = options.definition;
            this.orm                = options.orm;
            this.getDatabase        = options.getDatabase;
            this.mappingMap         = options.mappingMap;
            this.referenceMap       = options.referenceMap;
            this.belongsToMap       = options.belongsToMap;
            this.columns            = options.columns;
            this._extensions        = options.extensions;

            this.accessorMap        = {get:{}, fetch: {}, join: {}};
            this.description        = {};

            // create a custom querybuilder class
            this.QueryBuilder = this.build();

            return this.QueryBuilder;
        }



        

        , build: function() {
            var   classDefinition   = {}
                , thisContext       = this
                , CustomResource
                , QueryBuilderConstructor;

            // the class inherits from the querybuilder class
            classDefinition.inherits = QueryBuilder;

            // eventlisteners on the querybuilder, used by extensions
            classDefinition._extensionEventListeners = {};

            // required objects on each querybuilder, shared between all of the instances
            classDefinition._queryBuilders  = this.queryBuilders;
            classDefinition._definition     = this.definition;
            classDefinition.definition      = this.definition;
            classDefinition._orm            = this.orm;
            //classDefinition._getDatabase    = this.getDatabase;

            this.addMappingMethods(classDefinition);
            this.addBelongsToMethods(classDefinition);
            this.addReferenceMethods(classDefinition);

            this.addGenericMethods(classDefinition);

            classDefinition.describeMethods = function(){
                log(thisContext.description);
                return this;
            };

            // apply extensions
            this.applyQueryBuilderExtensions(classDefinition);

            // apply the custom resource
            CustomResource = this.applyResourceExtensions(classDefinition);
            classDefinition.Resource = CustomResource;

            QueryBuilderConstructor = new Class(classDefinition);
            QueryBuilderConstructor.Resource = CustomResource;
            QueryBuilderConstructor.describeMethods = classDefinition.describeMethods;

            return QueryBuilderConstructor;
        }



        /*
         * gets all extensions that should be used on this model and applies them 
         * to this querybuilder
         *
         * @param <Object> class definition
         */
        , applyQueryBuilderExtensions: function(classDefinition) {
            var extensions = this._extensions.getModelExtensions(this.definition);

            if (debug) log.info('Found %s extension(s) for the «%s» model ..', extensions.length, this.definition.tableName);

            extensions.forEach(function(extension) {
                // collect mehotds
                if (type.function(extension.applyQueryBuilderMethods)) extension.applyQueryBuilderMethods(this.definition, classDefinition);

                // check for event listeners
                extension.getQueryBuilderEventListeners().forEach(function(listener) {
                    if (debug) log.debug('Registering «%s» extension event on the «%s» model ...', listener.event, this.definition.tableName);

                    if (!classDefinition._extensionEventListeners[listener.event]) classDefinition._extensionEventListeners[listener.event] = [];
                    classDefinition._extensionEventListeners[listener.event].push(listener.listener);
                }.bind(this));
            }.bind(this));
        }

         /*
         * gets all extensions that should be used on this model and applies them 
         * to this resource
         *
         * @param <Object> class definition
         */
        , applyResourceExtensions: function() {
            var   extensions = this._extensions.getModelExtensions(this.definition)
                , CustomResource;

            // we're creating customized version of the resource
            CustomResource = {
                inherits: Resource

                , _extensionEventListeners: {}
            };
            
            if (debug) log.info('Found %s extension(s) for the «%s» model ..', extensions.length, this.definition.tableName);

            extensions.forEach(function(extension) {
                // collect mehotds
                if (type.function(extension.applyResourceMethods)) extension.applyResourceMethods(this.definition, CustomResource);

                // check for event listeners
                extension.getResourceEventListeners().forEach(function(listener) {
                    if (debug) log.debug('Registering «%s» extension event on the «%s» model ...', listener.event, this.definition.tableName);

                    if (!CustomResource._extensionEventListeners[listener.event]) CustomResource._extensionEventListeners[listener.event] = [];
                    CustomResource._extensionEventListeners[listener.event].push(listener.listener);
                }.bind(this));
            }.bind(this));

            // store on querybuilder
            return new Class(CustomResource);
        }





        , addMappingMethods: function(classDefinition) {
            Object.keys(this.columns).filter(function(id){
                return this.columns[id].type === 'mapping';
            }.bind(this)).forEach(function(id) {
                var   target    = this.columns[id].definition
                    , column    = this.columns[id].column
                    , getName   = this.getAccessorName(id)
                    , fetchName = this.getAccessorName(id, 1)
                    , joinName  = this.getAccessorName(id, 2);

                this.accessorMap.get[id] = function() {
                    return this._handleMapping(column, target, Array.prototype.slice.call(arguments), true);
                };
                this.accessorMap.fetch[id] = function() {
                    return this._handleMapping(column, target, Array.prototype.slice.call(arguments));
                };
                this.accessorMap.join[id] = function(returnTarget) {
                    return this._handleMapping(column, target, null, returnTarget, true);
                };

                this.description[getName]       = 'Mapping accessor for the «'+id+'» Model';
                this.description[fetchName]     = 'Mapping accessor for the «'+id+'» Model';
                this.description[joinName]      = 'Mapping accessor for the «'+id+'» Model';

                classDefinition[getName]        = Class(this.accessorMap.get[id]).Enumerable();
                classDefinition[fetchName]      = Class(this.accessorMap.fetch[id]).Enumerable();
                classDefinition[joinName]       = Class(this.accessorMap.join[id]).Enumerable();
            }.bind(this));
        }



        , addBelongsToMethods: function(classDefinition) {
            Object.keys(this.columns).filter(function(id){
                return this.columns[id].type === 'belongsTo';
            }.bind(this)).forEach(function(id) {
                var   target    = this.columns[id].definition
                    , column    = this.columns[id].column
                    , getName   = this.getAccessorName(id)
                    , fetchName = this.getAccessorName(id, 1)
                    , joinName  = this.getAccessorName(id, 2);

                this.accessorMap.get[id] = function() {
                    return this._handleBelongsTo(column, target, Array.prototype.slice.call(arguments), true);
                };
                this.accessorMap.fetch[id] = function() {
                    return this._handleBelongsTo(column, target, Array.prototype.slice.call(arguments));
                };
                this.accessorMap.join[id] = function(returnTarget) {
                    return this._handleBelongsTo(column, target, null, returnTarget, true);
                };


                if (target.aliasName) {
                    this.accessorMap.get[target.aliasName]      = this.accessorMap.get[id];
                    this.accessorMap.fetch[target.aliasName]    = this.accessorMap.fetch[id];
                    this.accessorMap.join[target.aliasName]     = this.accessorMap.join[id];
                }


                this.description[getName]       = 'Belongs to accessor for the «'+id+'» Model';
                this.description[fetchName]     = 'Belongs to accessor for the «'+id+'» Model';
                this.description[joinName]      = 'Belongs to accessor for the «'+id+'» Model';

                classDefinition[getName]        = Class(this.accessorMap.get[id]).Enumerable();
                classDefinition[fetchName]      = Class(this.accessorMap.fetch[id]).Enumerable();
                classDefinition[joinName]       = Class(this.accessorMap.join[id]).Enumerable();
            }.bind(this));
        }



        , addReferenceMethods: function(classDefinition) {
            Object.keys(this.columns).filter(function(id){
                return this.columns[id].type === 'reference';
            }.bind(this)).forEach(function(id) {
                var   target    = this.columns[id].definition
                    , column    = this.columns[id].column
                    , getName   = this.getAccessorName(id)
                    , fetchName = this.getAccessorName(id, 1)
                    , joinName  = this.getAccessorName(id, 2);


                this.accessorMap.get[id] = function() {
                    return this._handleReference(column, target, Array.prototype.slice.call(arguments), true);
                };
                this.accessorMap.fetch[id] = function() {
                    return this._handleReference(column, target, Array.prototype.slice.call(arguments));
                };
                this.accessorMap.join[id] = function(returnTarget) {
                    return this._handleReference(column, target, null, returnTarget, true);
                };


                if (column.aliasName) {
                    this.accessorMap.get[column.aliasName]      = this.accessorMap.get[id];
                    this.accessorMap.fetch[column.aliasName]    = this.accessorMap.fetch[id];
                    this.accessorMap.join[column.aliasName]     = this.accessorMap.join[id];
                }

                this.description[getName]       = 'Reference accessor for the «'+id+'» Model';
                this.description[fetchName]     = 'Reference accessor for the «'+id+'» Model';
                this.description[joinName]      = 'Reference accessor for the «'+id+'» Model';

                classDefinition[getName]        = Class(this.accessorMap.get[id]).Enumerable();
                classDefinition[fetchName]      = Class(this.accessorMap.fetch[id]).Enumerable();
                classDefinition[joinName]       = Class(this.accessorMap.join[id]).Enumerable();
            }.bind(this));
        }



        , addGenericMethods: function(classDefinition) {
            var   accessorMap   = this.accessorMap
                , mappingMap    = this.mappingMap
                , referenceMap  = this.referenceMap
                , belongsToMap  = this.belongsToMap
                , definition    = this.definition;


            // generic methods for gettin a target entity
            classDefinition.get = Class(function(targetName) {
                if (Object.hasOwnProperty.call(accessorMap.get, targetName)) { 
                    return accessorMap.get[targetName].apply(this, Array.prototype.slice.call(arguments, 1));
                } else throw new Error('The QueryBuilder has no property «'+targetName+'»!'); 
            }).Enumerable();

            classDefinition.fetch = Class(function(targetName) {
                if (Object.hasOwnProperty.call(accessorMap.fetch, targetName)) {
                    return accessorMap.fetch[targetName].apply(this, Array.prototype.slice.call(arguments, 1));
                } else throw new Error('The QueryBuilder has no property «'+targetName+'»!'); 
            }).Enumerable();

            classDefinition.join = Class(function(targetName, returnTarget) {
                if (Object.hasOwnProperty.call(accessorMap.join, targetName)) {
                    return accessorMap.join[targetName].apply(this, Array.prototype.slice.call(arguments, 1), !!returnTarget);
                } else throw new Error('The QueryBuilder has no property «'+targetName+'»!'); 
            }).Enumerable();


            // generic method for mappings
            classDefinition.getMapping = Class(function(mappingTableName) {
                var info = mappingMap[mappingTableName];
                if (info) return this._handleMapping(info.column, info.target, Array.prototype.slice.call(arguments, 1), true);
                else throw new Error('Unknown mapping «'+mappingTableName+'» on entity «'+definition.name+'»!');                    
            }).Enumerable();

            classDefinition.fetchMapping = Class(function(mappingTableName) {
                var info = mappingMap[mappingTableName];
                if (info) return this._handleMapping(info.column, info.target, Array.prototype.slice.call(arguments, 1));
                else throw new Error('Unknown mapping «'+mappingTableName+'» on entity «'+definition.name+'»!');                    
            }).Enumerable();


            // generic methods for references
            classDefinition.getReference = Class(function(referencedTable) {
                var info = referenceMap[referencedTable];
                if (info) return this._handleReference(info.column, info.target, Array.prototype.slice.call(arguments, 1), true);
                else throw new Error('Unknown reference «'+referencedTable+'» on entity «'+definition.name+'»!');                   
            }).Enumerable();

            classDefinition.fetchReference = Class(function(referencedTable) {
                var info = referenceMap[referencedTable];
                if (info) return this._handleReference(info.column, info.target, Array.prototype.slice.call(arguments, 1));
                else throw new Error('Unknown reference «'+referencedTable+'» on entity «'+definition.name+'»!');                   
            }).Enumerable();


            // generic methods for belongs to
            classDefinition.getBelongsTo = Class(function(belongingTableName) {
                var info = belongsToMap[belongingTableName];
                if (info) return this._handleBelongsTo(info.column, info.target, Array.prototype.slice.call(arguments, 1), true);
                else throw new Error('Unknown belongstTo «'+mappingTableName+'» on entity «'+definition.name+'»!');                 
            }).Enumerable();

            classDefinition.fetchBelongsTo = Class(function(belongingTableName) {
                var info = belongsToMap[belongingTableName];
                if (info) return this._handleBelongsTo(info.column, info.target, Array.prototype.slice.call(arguments, 1));
                else throw new Error('Unknown belongstTo «'+mappingTableName+'» on entity «'+definition.name+'»!');                 
            }).Enumerable();
        }



        , getAccessorName: function(id, method) {
            if (method === 1) return 'fetch' + id[0].toUpperCase()+id.slice(1);
            else if (method === 2) return 'join' + id[0].toUpperCase()+id.slice(1);
            else return 'get' + id[0].toUpperCase()+id.slice(1);
        }
    });
}();
