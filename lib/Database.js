!function(){

	var   Class 		= require('ee-class')
		, EventEmitter 	= require('ee-event-emitter')
		, log 			= require('ee-log')
		, queryBuilder 	= require('./queryBuilder')
		, Model 		= require('./Model');




	module.exports = new Class({
		inherits: EventEmitter

		, init: function(options) {
			// remove deprecated parent property
			delete this.parent;

			// get the customized querybuilder class
			this._setProrperty('_QueryBuilder', queryBuilder(options.orm, options.definition));

			// orm
			this._setProrperty('_orm', options.orm);

			// initialize the orm
			this._initialize(options.definition);

			this.emit('load');
		}



		, _setProrperty: function(name, value){
			Object.defineProperty(this, name, {value: value});
		}


		, _initialize: function(definition){
			Object.keys(definition).forEach(function(tablename){
				if (this[tablename]) next(new Error('Failed to load ORM for database «'+definition.getDatabaseName()+'», the tablename «'+tablename+'» is reserved for the orm.').setName('ORMException'));

				this[tablename] = new Model({
					  orm: 			this._orm
					, definition: 	definition[tablename]
					, QueryBuilder: this._QueryBuilder
				});
			}.bind(this));
		}

	});
}();
