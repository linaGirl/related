!function(){

	var   Class 		= require('ee-class')
		, EventEmitter 	= require('ee-event-emitter')
		, log 			= require('ee-log')
		, args 			= require('ee-arguments')
		, Set 			= require('./Set');



	var _orm;


	var QueryBuilder = {
		inherits: EventEmitter

		, init: function(options) {
			// remove deprecated parent property
			delete this.parent;

			this._setProrperty('_orm', options.orm);
			this._setProrperty('_definition', options.definition);

			Object.defineProperty(this, '_tablename', {value: options.definition.getTableName()});

			this._setProrperty('_query', {
				  filter: {}
				, select: ['id']
				, from: { 
					  database: options.definition.getDatabaseName()
					, table: 	options.definition.getTableName()
				}
			});
		}

		, _setProrperty: function(name, value){
			Object.defineProperty(this, name, {value: value});
		}


		, _build: function(tablename, parameters){
			var ref = {};

			// add to filter
			this._parseParameters(tablename, parameters);

			// return a new object whis prototype is this, so we can chain
			// commands on different levels of the mnodel chain
			ref.__proto__ = this;
			Object.defineProperty(ref, '_tablename', {value: tablename});
			return ref;
		}


		, _parseParameters: function(tablename, parameters){
			var   filter = args(parameters, 'object', {})
				, select = args(parameters, 'array', [])
				, options = args(parameters, 'object', {}, 2);


			Object.keys(filter).forEach(function(property){
				if (!this._query.filter[tablename]) this._query.filter[tablename] = {};
				this._query.filter[tablename][property] = filter[property];
			}.bind(this));
		}


		, find: function(callback){
			this._orm.getDatabase().getConnection(function(err, connection){ log(this._query);
				if (err) callback(err);
				else connection.query(this._query, function(err, rows){
					if (err) callback(err);
					else {
						var records = new Set();

						(rows || []).forEach(function(row){
							records.push(new this._orm[this._definition.getDatabaseName()][this._definition.getTableName()](row));
						}.bind(this));

						callback(null, records);
					}
				}.bind(this));
			}.bind(this));
		}
	};




	// initialize the querybuilder
	module.exports = function(orm, definition){
		var QB = {};

		_orm = orm;

		// clone class
		Object.keys(QueryBuilder).forEach(function(key){
			QB[key] = QueryBuilder[key];
		}.bind(this));

		// add instance specific method
		Object.keys(definition).forEach(function(tablename){
			QB[tablename] = function(){
				return this._build(tablename, Array.prototype.slice.call(arguments));
			}
		});

		return new Class(QB);
	};
}();
