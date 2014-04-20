!function(){

	var   Class 		= require('ee-class')
		, EventEmitter 	= require('ee-event-emitter')
		, log 			= require('ee-log')
		, ORM;




	module.exports = new Class({
			

		// child resources
		  children: []

		// id counter for the root resource
		, _id: 0

		// flags if this resource was already joined into the root resource
		, joined: false

		// select was executeed?
		, selectExecuted: false

		// which relating sets must be laoded
		, relatingSets: {}


		, get filtered() {
			return !!Object.keys(this.query.filter);
		}

		, init: function(options) {
			this.query 					= options.query;
			this.filters 				= options.filters;
			this.joins 					= options.joins || [];
			this.type 					= options.type;
			this.name 					= options.name;
			this.defaultSelect 			= options.defaultSelect || [];
			this.selected 				= options.selected;
			//this.filtered 				= options.filtered;
			this.parentResource 		= options.parentResource;
			this.Model 					= options.Model;
			this.referencedParentColumn = options.referencedParentColumn;
			this.referencedParentTable 	= options.referencedParentTable;
			this.primaryKeys 			= options.primaryKeys;
			this.rootResource 			= options.rootResource;
			this.rootFiltered 			= options.rootFiltered; // flags if this filter was added to the root query
			this.loaderId 				= options.loaderId;

			this.hasRootFilter = this.filters && !!Object.keys(this.filters).length;

			if (this.primaryKeys) this.defaultSelect = this.defaultSelect.concat(this.primaryKeys);

			if (!ORM) ORM = require('./ORM');

			// get an unique id
			if (this.parentResource) this.id = this.getUniqueId();
		}


		// get an unique id for this query ( get it fromt the root resource )
		, getUniqueId: function() {
			return this.rootResource.getId();
		}


		// only called on the root resource
		, getId: function() {
			return ++this._id;
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
			var filter;

			if (!this.rootFiltered) { // filter not yet added to root query?
				this.rootFiltered = true;

				// create join with alias, add it to the root resource( end )
				this.joins.reverse().forEach(function(joinStatement, index){
					this.rootResource.query.join.push(joinStatement.reverseFormat(this.id, (index > 0 ? this.id: this.parentResource.id)));
				}.bind(this));


				// filters
				if (this.filters && Object.keys(this.filters).length){
					filter = this.rootResource.query.filter[this.query.from+this.id] = {};

					Object.keys(this.filters).forEach(function(key){
						filter[key] = this.filters[key];
					}.bind(this));
				}
			}
		}





		, selectReferencedColumn: function(columnName) {
			this.query.select.push(columnName);
		}


		, applyFilter: function(resource) {
			var q = resource.query;

			if (!q.filter) q.filter = {};
			if (!q.filter[this.name]) q.filter[this.name] = {};
			q.filter[this.name][resource.referencedParentColumn] = ORM.in(this.set.getColumnValues(resource.referencedParentColumn));

			q.group.push({
				  table 	: this.name
				, column 	: resource.referencedParentColumn
			});
		}


		, hasChildren: function() {
			return !!this.children.length;
		}
	});
}();
