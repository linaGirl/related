!function(){

	var   Class 		= require('ee-class')
		, EventEmitter 	= require('ee-event-emitter')
		, log 			= require('ee-log')
		, Model 		= require('./Model')
		, Transaction 	= require('./Transaction');




	module.exports = new Class({
		inherits: EventEmitter

		, init: function(options) {
			// remove deprecated parent property
			delete this.parent;

			// orm
			this._setProrperty('_orm', options.orm);
			this._setProrperty('_database', options.database);
			this._setProrperty('_queryBuilders', {});

			// initialize the orm
			this._initialize(options.definition);

			// emit load not before the next main loop execution
			process.nextTick(function(){
				this.emit('load');
			}.bind(this));
		}


		, createTransaction: function() {
			return new Transaction(this);
		}


		, executeQuery: function(mode, query, callback) {
			this._database.query(mode, query, callback);
		}


		, _setProrperty: function(name, value){
			Object.defineProperty(this, name, {value: value, writable: true});
		}


		, _getDatabase: function(){
			return this;
		}


		, _initialize: function(definition){
			Object.keys(definition).forEach(function(tablename){
				if (this[tablename]) next(new Error('Failed to load ORM for database «'+definition.getDatabaseName()+'», the tablename «'+tablename+'» is reserved for the orm.').setName('ORMException'));

				this[tablename] = new Model({
					  orm 				: this._orm
					, definition 		: definition[tablename]
					, queryBuilders 	: this._queryBuilders
					, getDatabase 		: this._getDatabase.bind(this)
				});
			}.bind(this));
		}

	});
}();
