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

        // is set to true as soon the join statement 
        // was applied to the root resource
        , _joinApplied: false

        // is set to true as soon the filter statement 
        // was applied to the root resource
        , _filterApplied: false

        // is set to true as soon the order statement 
        // was applied to the root resource
        , _orderingApplied: false

        // is set to true as soon the current resource 
        // was prepared for selection
        , _selectApplied: false

        // wheter to delete soft deleted records, does only work if the configuration
        // did enable the timestamps option (including the deleted property)
        , _filterDeleted: true

        // if this resource has filters that must be applied to the root resource
        , _hasRootFilters: false

        // if this resource has ordering that must be applied to the root resource
        , _hasRootOrdering: false



        // select was executeed?
        , selectExecuted: false

        

        // returns an id which is used to priorize the order stetements
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
            this.parentResource         = options.parentResource;
            this.Model                  = options.Model;
            this.referencedParentColumn = options.referencedParentColumn;
            this.referencedParentTable  = options.referencedParentTable;
            this.primaryKeys            = options.primaryKeys;
            this.rootResource           = options.rootResource;
            this.loaderId               = options.loaderId;


            // order statetemnt for the root query
            Class.define(this, 'order', Class([]).Enumerable())

            // we nedd to store childresources
            Class.define(this, 'children', Class([]).Enumerable())

            // indicates which relatingsets must be laoded
            Class.define(this, 'relatingSets', Class({}).Enumerable())


            // set indicator for root filters
            this._hasRootFilters = this.filters && Object.keys(this.filters).length;



            // make sure we have access to the orm (circular dependency)
            if (!ORM) ORM = require('./ORM');

            // get an unique id
            if (this.parentResource) this.id = this.getUniqueId();
            else this.id = '';

            if (debug)  log.info('New resource ['+(this.id||this._id)+'] '+this.name.cyan+', has rootFilters: '+ ((!!this.hasRootFilter)+'').yellow+', is selected: '+ ((!!this.selected)+'').yellow+'');
        }

        // don't filter ou t soft dleted records
        , ignoreSoftDelete: function() {
            this._filterDeleted = false;
        }


        // get an unique id for this query ( get it fromt the root resource )
        , getUniqueId: function() {
            return this.getRootResoure().getId();
        }


        // only called on the root resource
        , getId: function() {
            return ++this._id;
        }

        

        /*
         * prepare the rootresource
         */
        , prepare: function() {
            var name = this.query.from+this.id;

            if (!this.isRootResource()) throw new Error('You cannot prepare a childreource!');

            // we need the primary keys on the root query
            this.selectPrimaryKeys();

            // checki f we have to add soft dleete filters
            if (this.isRootResource() && this._filterDeleted && this.Model.definition.deletedTimestamp) {
                if (!this.query.filter[name]) this.query.filter[name] = {};
                this.query.filter[name][this.Model.definition.deletedTimestamp] = null;
            }

            // prepare all children, add their filters & ordering to the root query
            this._prepareChildrenFroRootResource(this);

            // prepare selction of child resources
            this._selectChildren(this);
        }


        /*
         * check which children must be selected. this means to select 
         * all parents if required. 
         */
        , _selectChildren: function(resource) {
            if (resource.hasChildren()) {

                // prepare all children
                resource.getChildren().forEach(function(childResource) {
                    childResource.prepareSelect();
                    this._selectChildren(childResource);
                }.bind(this));
            }
        }



        /*
         * prepare the children for the root resource
         * add root filter, ordering
         */
        , _prepareChildrenFroRootResource: function(resource) {
            if (resource.hasChildren()) {
                resource.getChildren().forEach(function(childResource) {
                    childResource.prepareRootQuery();
                    this._prepareChildrenFroRootResource(childResource);
                }.bind(this));
            }
        }




        /*
         * mark a relating set for loading
         */
        , loadRelatingSet: function(name) {
            this.relatingSets[name] = true;
        }



        /*
         * check if this resource is selected, if yes, check if there
         * is a soft delete filter that msut be applied and make sure all 
         * parents are selected using their primary keys.
         */
        , prepareSelect: function() {
            var parent;

            if (this.isSelected() && !this.selectApplied()) {
                parent = this.getParent();

                this.selectApplied(true);

                // make sure our pks are selected
                this.selectPrimaryKeys();

                // check for soft deletes
                if (!this.isRootResource() && this.getRootResoure()._filterDeleted && this.Model.definition.deletedTimestamp) {
                    if (!this.query.filter[name]) this.query.filter[name] = {};
                    this.query.filter[name][this.Model.definition.deletedTimestamp] = null;
                }


                // select the parent referenced field
                if (this.referencedParentColumn) this.query.select.push(ORM.alias('____id____', this.referencedParentTable, this.referencedParentColumn));                    
                else this.query.select.push(ORM.alias('____id____', this.referencedParentTable, this.referencedParentColumn));   

                if (parent) {
                    // make sure the parent is selected
                    if (!parent.isSelected()) {
                        // select referenced column if required
                        if (this.referencedParentColumn) parent.selectColumn(this.referencedParentColumn);

                        // prepare parents
                        parent.prepareSelect();
                    }
                    else {
                        // select referenced column if required
                        if (this.referencedParentColumn) parent.selectColumn(this.referencedParentColumn);
                    }
                }
            }
        }


        /*
         * add my own pks to the select statement
         */
        , selectPrimaryKeys: function() {
            this.Model.definition.primaryKeys.forEach(function(fieldName){
                if (this.query.select.indexOf(fieldName) === -1 && this.query.select.indexOf('*') === -1) this.query.select.push(fieldName);
            }.bind(this));
        }



        /*
         * indicates if this resource was selected by the user
         */
        , isSelected: function() {
            return !!this.query.select.length;
        }



        /*
         * select a column on this resource
         */
        , selectColumn: function(columnName) {
            this.query.select.push(columnName);
        }



        /*
         * filter a resource by the ids of my primarykey
         * thi is called on the root resource only and
         * only after the root query was executed (so there 
         * is a set witrh ids)
         */
        , applyFilter: function(resource) {
            var q = resource.query;

            if (!q.filter) q.filter = {};
            if (!q.filter[this.name]) q.filter[this.name] = {};
            q.filter[this.name][this.primaryKeys[0]] = ORM.in(this.set.getColumnValues(this.primaryKeys[0]));
        }



        /*
         * group a resource by my primarykeys, this is used by the 
         * querycompiler
         */
        , applyGroup: function(resource) {
            this.primaryKeys.forEach(function(pk) {
                resource.query.group.push({
                      table     : this.name
                    , column    : pk
                });
            }.bind(this));
        }



        /*
         * prepare the root query based on the configuration of this
         * resource. this function calls the parent until it reaches 
         * the root resource. applies filters, electes, orders. 
         * this method is called on each of the children of the root
         * resource, so we need to check what was already joined and 
         * what not.
         */
        , prepareRootQuery: function() {
            if (this.hasFiltersForTheRootResource()) {
                // we have some filters that must be applied to the root
                // query
                this.addJoinsToRootResource();

                // apply filters all the way up to the root resource
                this.addFiltersToRootResource();
            }


            if (this.hasOrderingForTheRootResource()) {
                // we have some ordering that must be applied to the root
                // query, do left joins
                this.addJoinsToRootResource(true); 

                // apply orderings all the way up to the root resource
                this.addOrderingToRootResource();
            }


            //if (this.hasGroupingForTheRootResource()) {
                // to do
            //}
        }



        /*
         * if this resource has ordering for the root query
         */
        , hasOrderingForTheRootResource: function() {
            return !!this._hasRootOrdering;
        }


        /*
         * if this resource has filters for the root query
         */
        , hasFiltersForTheRootResource: function() {
            return !!this._hasRootFilters;
        }


        /*
         * add the ordering to the root resource, do this also
         * for all parent resources
         */ 
        , addOrderingToRootResource: function() {
            if (!this.isRootResource() && !this.orderingApplied()) {
                // apply ordering to root
                this.applyOrdering(this.getRootResoure());

                // do the same on my parent
                this.getParent().addOrderingToRootResource();
            }
        }


        /*
         * apply local ordering to the root resource
         */
        , applyOrdering: function(targetResource) {
            this.order.forEach(function(instruction) {
                this.targetResource.query.order.push({
                      entity    : this.name+(this.id ? this.id : '')
                    , property  : instruction.property
                    , desc      : instruction.desc
                    , priority  : instruction.priority
                });
            }.bind(this));
        }



        /*
         * add the all filters to the root resource, do this also
         * for all parent resources
         */ 
        , addFiltersToRootResource: function() {
            if (!this.isRootResource() && !this.filterApplied()) {
                // apply filters to root
                this.applyFilters(this.getRootResoure());

                // do the same on my parent
                this.getParent().addFiltersToRootResource();
            }
        }


        /*
         * apply local filters to the root resource
         */
        , applyFilters: function(targetResource) {
            var   name = this.query.from+this.id
                , targetFilter;

            // mke sure there is an object to write to
            if (!targetResource.query.filter[name]) targetResource.query.filter[name] = {};

            // normal filters
            if (this.filters && Object.keys(this.filters).length) {                
                targetFilter = targetResource.query.filter[name];

                Object.keys(this.filters).forEach(function(key){
                    targetFilter[key] = this.filters[key];
                }.bind(this));
            }

            // mark as applied
            this.filterApplied(true);
        }


        /*
         * add the current joins statment to the root query, call the 
         * same method on all parents until we're at the root resource
         * itself
         */
        , addJoinsToRootResource: function(leftJoin) {
            if (!this.isRootResource() && !this.joinApplied()) {
                // do the same on my parent
                this.getParent().addJoinsToRootResource(leftJoin);

                // apply joins to root
                this.applyJoins(this.getRootResoure(), leftJoin);
            }
        }



        /*
         * apply joins needed for working on this resource to the
         * targetResource resource
         */
        , applyJoins: function(targetResource, leftJoin) {
            var   name = this.query.from+this.id
                , targetFilter;

            this.joins.reverse().forEach(function(joinStatement, index) {
                targetResource.query.join.push(joinStatement.reverseFormat(this.id, (index > 0 ? this.id: this.getParent().id), leftJoin));
            }.bind(this));


            // if we're joining we may need to filter soft deletes
            if (this._filterDeleted && this.getDefinition().deletedTimestamp) {
                targetFilter = this.getRootResoure().query.filter[name];
                targetFilter[this.getDefinition().deletedTimestamp] = null;
            }

            // mark as used
            this.joinApplied(true);
        }


        /*
         * returns the definition of the current model
         */
        , getDefinition: function() {
            return this.Model.definition;
        }


        /*
         * flags that this resource was joined already
         */
        , joinApplied: function(status) {
            if (status !== undefined) this._joinApplied = status;
            return this._joinApplied;
        }

        /*
         * flags that this resource was selected already
         */
        , selectApplied: function(status) {
            if (status !== undefined) this._selectApplied = status;
            return this._selectApplied;
        }


        /*
         * flags that this resource was ordered already
         */
        , orderingApplied: function(status) {
            if (status !== undefined) this._orderingApplied = status;
            return this._orderingApplied;
        }


        /*
         * flags that this resource was filtered already
         */
        , filterApplied: function(status) {
            if (status !== undefined) this._filterApplied = status;
            return this._filterApplied;
        }


        /*
         * returns the root resource (itself if its the root resource)
         */
        , getRootResoure: function() {
            return this.rootResource || this;
        }


        /*
         * returns if this is the root resource (this has no parents)
         */
        , isRootResource: function() {
            return !this.hasParent();
        }


        /*
         * returns if this resource has a parent
         */
        , hasParent: function() {
            return !!this.getParent();
        }


        /*
         * returns the resources parent, if avialable
         */
        , getParent: function() {
            return this.parentResource;
        }


        /*
         * return child resources
         */
        , getChildren: function() {
            return this.children;
        }


        /*
         * returns if this resource has children
         */
        , hasChildren: function() {
            return !!this.children.length;
        }
    });
}();
