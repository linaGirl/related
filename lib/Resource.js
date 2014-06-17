!function () {
    'use strict';

    var   Class         = require('ee-class')
        , EventEmitter  = require('ee-event-emitter')
        , debug         = require('ee-argv').has('dev-orm')
        , log           = require('ee-log')
        , ORM;




    module.exports = new Class({

        // id counter for the root resource
         _id: 0

        // flags if this resource was already joined into the root resource
        , joined: false

        // select was executeed?
        , selectExecuted: false

        // wheter to delete soft deleted records, does only work if the configuration
        // did enable the timestamps option (including the deleted property)
        , filterDeleted: true


        , filtered: {get: function () {
            return !!Object.keys(this.query.filter).length;
        }}

        , isRootOrdered: { get: function() {
            return !!this.order.length;
        }}

        , orderId: { get: function() {
            if (!this._orderPrioriztionId) this._orderPrioriztionId = 0;
            return ++this._orderPrioriztionId;
        }}

        , init: function (options) {
            this.query                  = options.query;
            this.filters                = options.filters;
            this.joins                  = options.joins || [];
            this.type                   = options.type;
            this.name                   = options.name;
            this.defaultSelect          = options.defaultSelect || [];
            this.selected               = options.selected;
            //this.filtered                 = options.filtered;
            this.parentResource         = options.parentResource;
            this.Model                  = options.Model;
            this.referencedParentColumn = options.referencedParentColumn;
            this.referencedParentTable  = options.referencedParentTable;
            this.primaryKeys            = options.primaryKeys;
            this.rootResource           = options.rootResource;
            this.rootFiltered           = options.rootFiltered; // flags if this filter was added to the root query
            this.loaderId               = options.loaderId;


            // root query order
            this.order = [];
            this.rootOrdered = false;

            Class.define(this, 'children', Class([]).Enumerable())
            Class.define(this, 'relatingSets', Class({}).Enumerable())

            this.hasRootFilter = this.filters && Object.keys(this.filters).length;

            if (this.primaryKeys) this.defaultSelect = this.defaultSelect.concat(this.primaryKeys);


            if (!ORM) ORM = require('./ORM');

            // get an unique id
            if (this.parentResource) this.id = this.getUniqueId();
            else this.id = '';

            if (debug) {
                log.info('New resource ['+(this.id||this._id)+'] '+this.name.cyan+', has rootFilters: '+ ((!!this.hasRootFilter)+'').yellow+', is selected: '+ ((!!this.selected)+'').yellow+'');
            }
        }

        // don't filter ou t soft dleted records
        , ignoreSoftDelete: function() {
            this.filterDeleted = false;
        }


        // get an unique id for this query ( get it fromt the root resource )
        , getUniqueId: function() {
            return this.rootResource.getId();
        }


        // only called on the root resource
        , getId: function() {
            return ++this._id;
        }

        // set soft delete filter on root resource
        , prepare: function() {
            var name = this.query.from+this.id;

            if (!this.rootResource && this.filterDeleted && this.Model.definition.deletedTimestamp) {
                if (!this.query.filter[name]) this.query.filter[name] = {};
                this.query.filter[name][this.Model.definition.deletedTimestamp] = null;
            }
        }

        // check which relating sets to load
        , loadRelatingSet: function(name) {
            this.relatingSets[name] = true;
        }


        , select: function() {
            if (!this.selectExecuted) {
                this.selectExecuted = true;
                this.selected = true;

                // add parent reference to selects
                if (this.referencedParentColumn) {
                    this.defaultSelect.push(ORM.alias('____id____', this.referencedParentTable, this.referencedParentColumn));

                    this.parentResource.selectReferencedColumn(this.referencedParentColumn);
                }

                // add additional  selected fields to query
                this.query.addSeleted(this.defaultSelect);

                // create join statements
                this.query.formatJoins();
            }
        }



        // add my joins to the root (at the end)
        , filter: function() {
            var   name = this.query.from+this.id
                , filter;

            if (!this.rootFiltered) { // filter not yet added to root query?
                this.rootFiltered = true;

                // don't join when not filtered
                if (this.hasRootFilter) {
                    // create join with alias, add it to the root resource( end )
                    this.joins.reverse().forEach(function(joinStatement, index){
                        joinStatement.used = true;
                        this.rootResource.query.join.push(joinStatement.reverseFormat(this.id, (index > 0 ? this.id: this.parentResource.id)));
                    }.bind(this));
                    this.rootJoined = true;


                    // filters
                    if (this.filters && Object.keys(this.filters).length){
                        filter = this.rootResource.query.filter[name] = {};

                        Object.keys(this.filters).forEach(function(key){
                            filter[key] = this.filters[key];
                        }.bind(this));
                    }
                }

                // filter soft deleted records?
                if (this.rootResource.filterDeleted && this.Model.definition.deletedTimestamp) {
                    if (!this.rootResource.query.filter[name]) this.rootResource.query.filter[name] = {};
                    this.rootResource.query.filter[name][this.Model.definition.deletedTimestamp] = null;
                }
            }
        }


        // add joins used for filtering
        , rootOrder: function() {
            if (!this.rootJoined) {
                this.joins.reverse().forEach(function(joinStatement, index){
                    if (!joinStatement.used) {
                        joinStatement.used = true;
                        this.rootResource.query.join.push(joinStatement.reverseFormat(this.id, (index > 0 ? this.id: this.parentResource.id), true));
                    }
                }.bind(this));
            }

            if (!this.rootOrdered) {
                // add order statement
                this.order.forEach(function(instruction) {
                    this.rootResource.query.order.push({
                          entity    : this.name+(this.id ? this.id : '')
                        , property  : instruction.property
                        , desc      : instruction.desc
                        , priority  : instruction.priority
                    });
                }.bind(this));
            }
        }



        , joinRoot: function(leftJoin) {
             this.joins.reverse().forEach(function(joinStatement, index){
                if (!joinStatement.used) {
                    joinStatement.used = true;
                    this.rootResource.query.join.push(joinStatement.reverseFormat(this.id, (index > 0 ? this.id: this.parentResource.id), leftJoin));
                }
            }.bind(this));
        }




        , selectReferencedColumn: function(columnName) {
            this.query.select.push(columnName);
        }



        // filter a childquery by my ids, this is only called on the root resource
        , applyFilter: function(resource) {
            var q = resource.query;

            if (!q.filter) q.filter = {};
            if (!q.filter[this.name]) q.filter[this.name] = {};
            q.filter[this.name][this.primaryKeys[0]] = ORM.in(this.set.getColumnValues(this.primaryKeys[0]));

           /* this.primaryKeys.forEach(function(pk){
                q.group.push({
                      table     : this.name
                    , column    : pk
                });
            }.bind(this));

            q.group.push({
                  table     : this.name
                , column    : resource.referencedParentColumn
            });*/
        }


        , applyGroup: function(resource) { //log.highlight(this.name, resource.name);
            this.primaryKeys.forEach(function(pk){ //log.info(this.name, pk);
                resource.query.group.push({
                      table     : this.name
                    , column    : pk
                });
            }.bind(this));
        }


        , hasChildren: function() {
            return !!this.children.length;
        }
    });
}();
