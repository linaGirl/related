!function(){

	var   Class 		= require('ee-class')
		, log 			= require('ee-log')
		, type 			= require('ee-types')
		, EventEmitter 	= require('ee-event-emitter')
		, async 		= require('ee-async')
		, DBCluster 	= require('../../ee-db-cluster');


	var   Database 		= require('./Database')
		, Functions 	= require('./Functions');


	module.exports = new Class({
		inherits: EventEmitter


		, init: function(options) {
			delete this.parent;

			this._setProrperty('_options', options);

			this.fn = new Functions();

			// db connectivity
			this._initializeDatabase(options);

			this._initializeOrm(function(err){
				this.emit('load', err);
			}.bind(this));
		}


		, _setProrperty: function(name, value){
			Object.defineProperty(this, name, {value: value});
		}


		, _initializeOrm: function(callback) {
			this._db.describe(function(err, databases){
				if (err) callback(err);
				else {
					// initialize orm for each database
					async.each(Object.keys(databases), function(databaseName, next){
						if (this[databaseName]) next(new Error('Failed to load ORM for database «'+databaseName+'», the name is reserved for the orm.').setName('ORMException'));
						else {
							this[databaseName] = new Database({
								  orm: 			this
								, definition: 	databases[databaseName]
								, on: {
									load: function(){
										setTimeout(next, 0);
									}
								}
							});
						}
					}.bind(this), function(err, results){
						if (err) callback(results.filter(function(x){log(type(x)); return type.error(x)})[0]);
						else callback();
					}.bind(this));
				}
			}.bind(this));
		}


		, getDatabase: function(){
			return this._db;
		}


		, _initializeDatabase: function(options){
			this._setProrperty('_db', new DBCluster({type: options.db.type}));

			options.db.hosts.forEach(function(config){
				this._db.addNode(config);
			}.bind(this));
		}
	});
}();
