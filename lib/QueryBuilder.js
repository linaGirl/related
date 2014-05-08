!function(){

    var   Class         = require('ee-class')
        , EventEmitter  = require('ee-event-emitter')
        , log           = require('ee-log')
        , clone         = require('clone')
        , Arguments     = require('ee-arguments')
        , type          = require('ee-types')
        , Set           = require('./Set')
        , Query         = require('./Query')
        , Resource      = require('./Resource')
        , JoinStatement = require('./JoinStatement')
        , QueryCompiler = require('./QueryCompiler')
        , ORM;





    module.exports = new Class({

          isQuery: true


        , getEntityName: function() {
            return this.tableName;
        }


        , init: function(options) {

            // load circular depency if not alread loaded
            if (!ORM) ORM = require('./ORM');


            // the mapping that us got here
            Class.define(this, '_mapping', Class(options.mapping));

            // we need to access this properts often
            this.tableName = this._definition.getTableName();
            this.databaseName = this._definition.getDatabaseName();


            // subjoins used for eager loading
            Class.define(this, '_joins', Class(options.joins || []));


            // set or define the root resource
            if (options.rootResource) Class.define(this, '_rootResource', Class(options.rootResource));
            else {
                Class.define(this, '_rootResource', Class(new Resource({
                      Model             : this._orm[this.databaseName][this.tableName]
                    , name              : this.tableName
                    , primaryKeys       : this._definition.primaryKeys
                    , rootFiltered      : true
                    , query             : new Query({
                          from:     this.tableName
                        , database: this.databaseName
                    })
                })));

                this._addPrimarySelect();
            }


            // the query we're currently working on
            Class.define(this, '_resource', Class(options.resource || this._rootResource));


            // parse passed parameters (happens only on the root of the query)
            if (options.parameters) {
                this._parseFilter(this._resource.query, this.tableName, this._getFilters(options.parameters));
                this._parseSelect(this._resource.query, this.tableName, this._getSelect(options.parameters));
            }
        }



        /**
         * the _handleReference method is called when the user selects 
         * a referenced subresource on the querybuilder
         * 
         * column           <Object>    definition of the column of this  
         *                              table which refrences the other table
         * targetModel      <Object>    definition of the targeted model of 
         *                              the reference
         * queryParameters  <Array>     parameters passed like the filter & 
         *                              selcet statements
         * returnTarget     <Boolean>   optional, if we're returning the reference
         *                              for this model or the reference of the
         *                              targeted model
         */
        , _handleReference: function(column, targetModel, queryParameters, returnTarget) {
            var   select            = this._getSelect(queryParameters)
                , filter            = this._getFilters(queryParameters)
                , targetModelName   = targetModel.name
                , group             = []
                , resource
                , joins;

            // create basic join definition, it will be converted to more specific join
            // statetments later on
            joins = [new JoinStatement({
                source : {
                      table     : column.referencedTable
                    , column    : column.referencedColumn
                } 
                , target: {
                      table     : this.tableName
                    , column    : column.name
                }
            })];


            targetModel.primaryKeys.forEach(function(key){
                group.push({
                      table     : targetModelName
                    , column    : key
                });
            });



            // create a child tree node for the querybuilder
            resource = new Resource({
                  name                      : targetModelName
                , selected                  : !!Object.keys(select).length
                , parentResource            : this._resource
                , Model                     : this._orm[this.databaseName][targetModelName]
                , referencedParentColumn    : column.name
                , referencedParentTable     : this.tableName
                , joins                     : joins
                , filters                   : filter
                , rootResource              : this._rootResource
                , primaryKeys               : targetModel.primaryKeys
                , type                      : 'reference'
                , loaderId                  : column.name
                , query                     : new Query({
                      join                  : joins.concat(this._joins)
                    , database              : this.databaseName
                    , from                  : targetModelName
                    , filter                : clone(this._resource.query.filter)
                    , group                 : group 
                })
            });


            // add primary keys to default seleczt
            targetModel.primaryKeys.forEach(function(key){resource.defaultSelect.push(key);});

            // process options / select on subquery
            this._parseSelect(resource.query, targetModelName, select);

            // store the subquery on the current query
            this._resource.children.push(resource);


            // we may stay at the same level (e.g. fetchModel vs. getModel)
            if (returnTarget) {
                return new this._queryBuilders[targetModelName]({
                      resource      : resource
                    , rootResource  : this._rootResource
                    , joins         : joins.concat(this._joins)
                });
            }
            else {
                return this;
            }   
        }




        , _handleBelongsTo: function(column, targetModel, queryParameters, returnTarget) {
            var   select            = this._getSelect(queryParameters)
                , filter            = this._getFilters(queryParameters)
                , targetModelName   = targetModel.model.name
                , group             = []
                , resource
                , joins;

            // create basic join definition, it will be converted to more specific join
            // statetments later on
            joins = [new JoinStatement({
                source : {
                      table     : targetModel.model.name
                    , column    : targetModel.targetColumn
                } 
                , target: {
                      table     : this.tableName
                    , column    : column.name
                }
            })];


            targetModel.model.primaryKeys.forEach(function(key){
                group.push({
                      table     : targetModelName
                    , column    : key
                });
            });
            


            // create a child tree node for the querybuilder
            resource = new Resource({
                  name                      : targetModelName
                , selected                  : !!Object.keys(select).length
                , parentResource            : this._resource
                , Model                     : this._orm[this.databaseName][targetModelName]
                , referencedParentColumn    : column.name
                , referencedParentTable     : this.tableName
                , joins                     : joins
                , filters                   : filter
                , rootResource              : this._rootResource
                , primaryKeys               : targetModel.model.primaryKeys
                , type                      : 'belongsTo'
                , loaderId                  : targetModel.model.name
                , query                     : new Query({
                      join                  : joins.concat(this._joins)
                    , database              : this.databaseName
                    , from                  : targetModelName
                    , filter                : clone(this._resource.query.filter)
                    , group                 : group
                })
            });



            // add primary keys to default seleczt
            targetModel.model.primaryKeys.forEach(function(key){resource.defaultSelect.push(key);});

            // process options / select on subquery
            this._parseSelect(resource.query, targetModelName, select);

            // store the subquery on the current query
            this._resource.children.push(resource);



            // we may stay at the same level (e.g. fetchModel vs. getModel)
            if (returnTarget) {
                return new this._queryBuilders[targetModelName]({
                      resource      : resource
                    , rootResource  : this._rootResource
                    , joins         : joins.concat(this._joins)
                });
            }
            else {
                return this;
            }   
        }



        /*
         * the _handleMapping method builds the queries for a mapping
         *
         * @param <String> the name of the column on our side of the mapping
         * @param <Object> the definition of the targeted table of the mapping
         * @param <Array> the parameters passed as filter / select / options for the mapping
         * @param <Boolean> wheter to return a querybuilder instance on the targeted table
         *                  of the paping or to stay on the same querybuilder
         */
        , _handleMapping: function(column, targetModel, queryParameters, returnTarget){
            var   select            = this._getSelect(queryParameters)
                , filter            = this._getFilters(queryParameters)
                , targetModelName   = targetModel.name
                , group             = []
                , resource
                , joins;

            // create basic join definition, it will be converted to more specific join
            // statetments later on
            joins = [new JoinStatement({
                source : {
                      table     : targetModel.model.name
                    , column    : targetModel.column.name
                } 
                , target: {
                      table     : targetModel.via.model.name
                    , column    : targetModel.via.otherFk
                }
            }), new JoinStatement({
                source : {
                      table     : targetModel.via.model.name
                    , column    : targetModel.via.fk                    
                } 
                , target: {  
                      table     : this.tableName
                    , column    : column.name
                }
            })];


            // group by pk of taarget and by pk of the parent model (this model)
            targetModel.model.primaryKeys.forEach(function(key){
                group.push({
                      table     : targetModel.model.name
                    , column    : key
                });
            }.bind(this));

            //log(this._definition);
            this._definition.primaryKeys.forEach(function(key){
                group.push({
                      table     : this.tableName
                    , column    : key
                });
            }.bind(this));



            // create a child tree node for the querybuilder
            resource = new Resource({
                  name                      : targetModelName
                , selected                  : !!Object.keys(select).length
                , parentResource            : this._resource
                , Model                     : this._orm[this.databaseName][targetModel.model.name]
                , referencedParentColumn    : column.name
                , referencedParentTable     : this.tableName
                , joins                     : joins
                , filters                   : filter
                , rootResource              : this._rootResource
                , primaryKeys               : targetModel.model.primaryKeys
                , type                      : 'mapping'
                , loaderId                  : targetModel.via.model.name
                , query                     : new Query({
                      join                  : joins.concat(this._joins)
                    , database              : this.databaseName
                    , from                  : targetModel.model.name
                    , filter                : clone(this._resource.query.filter)
                    , group                 : group
                })
            });


            // add primary keys to default seleczt
            targetModel.model.primaryKeys.forEach(function(key){resource.defaultSelect.push(key);});

            // process options / select on subquery
            this._parseSelect(resource.query, targetModel.model.name, select);

            // store the subquery on the current query
            this._resource.children.push(resource);



            // we may stay at the same level (e.g. fetchModel vs. getModel)
            if (returnTarget) {
                return new this._queryBuilders[targetModel.model.name]({
                      resource      : resource
                    , rootResource  : this._rootResource
                    , joins         : joins.concat(this._joins)
                });
            }
            else {
                return this;
            }               
        }



        , _getFilters: function(parameters) {
            return new Arguments(parameters).getObject({});
        }

        , _getSelect: function(parameters) {
            var   args          = new Arguments(parameters)
                , stringSelect  = args.getString();

            return args.getArray((stringSelect? [stringSelect] : []));
        }

        , _getOptions: function(parameters) {
            return new Arguments(parameters).getObjectByIndex(1, {});
        }


        , _parseFilter: function(query, tablename, filter) {
            Object.keys(filter).forEach(function(property){
                if (!query.filter[tablename]) query.filter[tablename] = {};
                query.filter[tablename][property] = filter[property];
            }.bind(this));
        }

        , _parseSelect: function(query, tablename, select) {
            select.forEach(function(item){
                query.select.push(item);
            }.bind(this));
        }



        , limit: function(limit) {
            if (type.number(limit)) this._resource.query.limit = limit;
            return this;
        }

        , offset: function(offset) {
            if (type.number(offset)) this._resource.query.offset = offset;
            return this;
        }


        , filter: function(filter) {
            this._resource.query.filter = filter;
            //this._parseFilter(this._resource.query, this.tableName, options);
            return this;
        }


        , _addPrimarySelect: function() {
            if (this._rootResource.query.select.length) {
                this._definition.primaryKeys.forEach(function(key){
                    this._rootResource.query.select.push(key);
                }.bind(this));
            }
        }



        , find: function(callback) {
            new QueryCompiler({
                  orm               : this._orm
                , getDatabase       : this._getDatabase
                , resource          : this._rootResource
            }).find(callback);
        }


        , findOne: function(callback) {
            new QueryCompiler({
                  orm               : this._orm
                , getDatabase       : this._getDatabase
                , resource          : this._rootResource
            }).findOne(callback);
        }


        , delete: function(callback) {
            new QueryCompiler({
                  orm               : this._orm
                , getDatabase       : this._getDatabase
                , resource          : this._rootResource
            }).delete(callback);
        }
    });
}();
