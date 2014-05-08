!function(){

    var   Class             = require('ee-class')
        , EventEmitter      = require('ee-event-emitter')
        , argv              = require('ee-argv')
        , QueryBuilder      = require('./QueryBuilder')
        , Model             = require('./Model')
        , RelatingSet       = require('./RelatingSet')
        , ModelBuilder      = require('./ModelBuilder')
        , clone             = require('clone')
        , log               = require('ee-log');




    var dev = argv.has('dev-orm');



    // model initializer
    module.exports = new Class({


        init: function(_options){
            var   thisContext = this
                , Constructor;

            this._definition    = _options.definition;
            this._getDatabase   = _options.getDatabase;
            this._orm           = _options.orm;

            // sotrage for relations
            this._mappingMap        = {};
            this._belongsToMap      = {};
            this._referenceMap      = {};
            this._columns           = {};
            this._genericAccessors  = {};


            if (dev) log.info('['+this._definition.getDatabaseName()+'] new model instance «'+this._definition.getTableName()+'» ...');

            // add properties for this specific model
            if (dev) log.debug('['+this._definition.getDatabaseName()+']['+this._definition.getTableName()+'] building model class ...');

            // create Model Class
            this.createModel(Model);


            if (dev) log.debug('['+this._definition.getDatabaseName()+']['+this._definition.getTableName()+'] building querbuilder class ...');
            this.QueryBuilder = new QueryBuilder({
                  orm               : this._orm
                , queryBuilders     : _options.queryBuilders
                , definition        : this._definition
                , getDatabase       : this._getDatabase
            });


            // ?
            _options.queryBuilders[_options.definition.getTableName()] = this.QueryBuilder;


            // constructor to expose
            Constructor = function(options, relatingSets) {

                if (this instanceof Constructor) {
                    if (dev) log.debug('['+this._definition.getDatabaseName()+']['+this._definition.getTableName()+'] returning model instance ...');

                    // new model instance
                    var instance = new thisContext.Model({
                          parameters        : options
                        , orm               : thisContext._orm
                        , definition        : thisContext._definition
                        , isFromDB          : options && options._isFromDB
                        , relatingSets      : relatingSets
                        , getDatabase       : thisContext._getDatabase
                    });

                    return instance;
                }
                else {
                    if (dev) log.debug('['+this._definition.getDatabaseName()+']['+this._definition.getTableName()+'] returning querybuilder instance ...');

                    // return a querybuilder
                    var qb = new thisContext.QueryBuilder({
                        parameters: Array.prototype.slice.call(arguments)
                    });

                    return qb;
                }
            };


            // the model definition must be accesible publicly
            Constructor.definition = _options.definition;

            // expose if its a mapping table
            if (this._definition.isMapping) Constructor.isMapping = true;

            // let the user define accessornames
            Constructor.setMappingAccessorName = this.setMappingAccessorName.bind(this);
            Constructor.setReferenceAccessorName = this.setReferenceAccessorName.bind(this);

            Constructor.getDefinition = this.getDefinition.bind(this);

            return Constructor;
        }


        , getDefinition: function() {
            return this._definition;
        }



        , createModel: function(Model) {
             this.Model = new ModelBuilder({
                  baseModel         : Model
                , definition        : this._definition
                , getDatabase       : this._getDatabase
                , mappingMap        : this._mappingMap
                , belongsToMap      : this._belongsToMap
                , referenceMap      : this._referenceMap
                , genericAccessors  : this._genericAccessors
                , columns           : this._columns
                , orm               : this._orm
            });
        }


        , setMappingAccessorName: function(mappingName, name) {
            if (!this.Model[name]) {
                if (!this._mappingMap[mappingName]) throw new Error('The mapping «'+mappingName+'» does not exists on the «'+this._definition.name+'» model!');

                this._mappingMap[mappingName].definition.aliasName = name;
                this._mappingMap[mappingName].definition.useGenericAccessor = false;

                this.createModel(Model);             
            }
            else throw new Error('The mapping accessor «'+name+'» on the model «'+this._model.name+'» is already in use!');
        }

        , setReferenceAccessorName: function(referenceName, name) {
            if (!this.Model[name]) {
                if (!this._referenceMap[referenceName]) throw new Error('The reference «'+referenceName+'» does not exists on the «'+this._definition.name+'» model!');

                this._referenceMap[referenceName].aliasName = name;
                this._referenceMap[referenceName].useGenericAccessor = false;

                this._genericAccessors[referenceName]

                this.createModel(Model);                     
            }
            else throw new Error('The reference accessor «'+name+'» on the model «'+this._model.name+'» is already in use!');
        }
    });
}();
