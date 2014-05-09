!function(){

    var   Class         = require('ee-class')
        , log           = require('ee-log')
        , QueryBuilder  = require('./QueryBuilder');




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

            this.accessorMap        = {get:{}, fetch: {}};
            this.description        = {};

            // create a custom querybuilder class
            this.QueryBuilder = this.build();

            return this.QueryBuilder;
        }


        , build: function() {
            var   classDefinition   = {}
                , thisContext       = this;

            // the class inherits from the querybuilder class
            classDefinition.inherits = QueryBuilder;

            // required objects on each querybuilder, shared between all of the instances
            classDefinition._queryBuilders  = this.queryBuilders;
            classDefinition._definition     = this.definition;
            classDefinition._orm            = this.orm;
            classDefinition._getDatabase    = this.getDatabase;

            this.addMappingMethods(classDefinition);
            this.addBelongsToMethods(classDefinition);
            this.addReferenceMethods(classDefinition);

            this.addGenericMethods(classDefinition);

            classDefinition.describeMethods = function(){log(thisContext.description);};

            return new Class(classDefinition);
        }



        , addMappingMethods: function(classDefinition) {
            Object.keys(this.columns).filter(function(id){
                return this.columns[id].type === 'mapping';
            }.bind(this)).forEach(function(id) {
                var   target    = this.columns[id].definition
                    , column    = this.columns[id].column
                    , getName   = this.getAccessorName(id)
                    , fetchName = this.getAccessorName(id, true);

                this.accessorMap.get[id] = function() {
                    return this._handleMapping(column, target, Array.prototype.slice.call(arguments), true);
                };
                this.accessorMap.fetch[id] = function() {
                    return this._handleMapping(column, target, Array.prototype.slice.call(arguments));
                };

                this.description[getName]       = 'Mapping accessor for the «'+id+'» Model';
                this.description[fetchName]     = 'Mapping accessor for the «'+id+'» Model';

                classDefinition[getName]        = Class(this.accessorMap.get[id]).Enumerable();
                classDefinition[fetchName]      = Class(this.accessorMap.fetch[id]).Enumerable();
            }.bind(this));
        }



        , addBelongsToMethods: function(classDefinition) {
            Object.keys(this.columns).filter(function(id){
                return this.columns[id].type === 'belongsTo';
            }.bind(this)).forEach(function(id) {
                var   target    = this.columns[id].definition
                    , column    = this.columns[id].column
                    , getName   = this.getAccessorName(id)
                    , fetchName = this.getAccessorName(id, true);

                this.accessorMap.get[id] = function() {
                    return this._handleBelongsTo(column, target, Array.prototype.slice.call(arguments), true);
                };
                this.accessorMap.fetch[id] = function() {
                    return this._handleBelongsTo(column, target, Array.prototype.slice.call(arguments));
                };

                this.description[getName]       = 'Belongs to accessor for the «'+id+'» Model';
                this.description[fetchName]     = 'Belongs to accessor for the «'+id+'» Model';

                classDefinition[getName]        = Class(this.accessorMap.get[id]).Enumerable();
                classDefinition[fetchName]      = Class(this.accessorMap.fetch[id]).Enumerable();
            }.bind(this));
        }



        , addReferenceMethods: function(classDefinition) {
            Object.keys(this.columns).filter(function(id){
                return this.columns[id].type === 'reference';
            }.bind(this)).forEach(function(id) {
                var   target    = this.columns[id].definition
                    , column    = this.columns[id].column
                    , getName   = this.getAccessorName(id)
                    , fetchName = this.getAccessorName(id, true);

                this.accessorMap.get[id] = function() {
                    return this._handleReference(column, target, Array.prototype.slice.call(arguments), true);
                };
                this.accessorMap.fetch[id] = function() {
                    return this._handleReference(column, target, Array.prototype.slice.call(arguments));
                };

                this.description[getName]       = 'Reference accessor for the «'+id+'» Model';
                this.description[fetchName]     = 'Reference accessor for the «'+id+'» Model';

                classDefinition[getName]        = Class(this.accessorMap.get[id]).Enumerable();
                classDefinition[fetchName]      = Class(this.accessorMap.fetch[id]).Enumerable();
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



        , getAccessorName: function(id, useFetch) {
            return (useFetch ? 'fetch' : 'get') + id[0].toUpperCase()+id.slice(1);
        }
    });
}();
