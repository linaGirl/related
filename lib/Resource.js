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



		, init: function(options) {
			this.query 					= options.query;
			this.filters 				= options.filters;
			this.joins 					= options.joins;
			this.type 					= options.type;
			this.name 					= options.name;
			this.defaultSelect 			= options.defaultSelect || [];
			this.selected 				= options.selected;
			this.filtered 				= options.filtered;
			this.parentResource 		= options.parentResource;
			this.Model 					= options.Model;
			this.referencedParentColumn = options.referencedParentColumn;
			this.referencedParentTable 	= options.referencedParentTable;
			this.primaryKeys 			= options.primaryKeys;
			this.rootResource 			= options.rootResource;
			this.rootFiltered 			= options.rootFiltered; // flags if this filter was added to the root query

			this.hasRootFilter = this.filters && !!Object.keys(this.filters).length;

			if (this.primaryKeys) this.defaultSelect = this.defaultSelect.concat(this.primaryKeys);

			if (!ORM) ORM = require('./ORM');
		}


		// get an unique id for this query ( get it fromt the root resource )
		, getUniqueId: function() {
			return this.rootResource.getId();
		}


		// only called on the root resource
		, getId: function() {
			return ++this._id;
		}


		, select: function() {
			if (!this.selectExecuted) {
				this.selectExecuted = true;
				this.selected = true;

				// add parent reference to selects
				if (this.referencedParentColumn) {
					this.defaultSelect.push(ORM.alias('____id____', this.referencedParentTable, this.parentResource.primaryKeys[0]));

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
			var id, filter;

			if (!this.rootFiltered) { // filter not yet added to root query?
				id = this.getUniqueId();
				this.rootFiltered = true;

				// create join with alias, add it to the root resource( end )
				this.joins.forEach(function(joinStatement){
					this.rootResource.query.join.push(joinStatement.reverseFormat(id));
				}.bind(this));

				// filters
				if (this.filters){
					filter = this.rootResource.query.filter[this.query.from+id] = {};

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
			q.filter[this.name][this.primaryKeys[0]] = ORM.in(this.set.getColumnValues(this.primaryKeys[0]));
		}


		, hasChildren: function() {
			return !!this.children.length;
		}
	});
}();
