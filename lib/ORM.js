!function(){

	var   Class 		= require('ee-class')
		, log 			= require('ee-log')
		, type 			= require('ee-types')
		, EventEmitter 	= require('ee-event-emitter')
		, arg 			= require('ee-arguments')
		, async 		= require('ee-async')
		, DBCluster 	= require('../../ee-db-cluster');


	var   Database 		= require('./Database')
		, Functions 	= require('./Functions')
		, staticORM 	= new (require('./StaticORM'))();




	var ORM = new Class({
		inherits: EventEmitter

		, init: function(options) {
			delete this.parent;

			this._setProrperty('_options', options);
			this._setProrperty('_dbNames', []);

			this.fn = new Functions();

			// db connectivity
			this._initializeDatabase(options);

			this._initializeOrm(function(err){
				this.emit('load', err);
			}.bind(this));
		}



		, transaction: function(){
			var instance = {
				  __proto__ 		: this
				, isTransaction 	: true
				, _db: {
					  __proto__ 	: this._db
					, getConnection : function(callback){
						this._getTransactionConnection(callback, instance);
					}.bind(this)
				}
			};


			this._dbNames.forEach(function(databaseName){
				instance[databaseName]._setOrm(instance);
			}.bind(this));

			return instance;
		}



		, commit: function(callback) {
			if (this._transactionConnection) {
				this._transactionConnection.commit(callback);
				delete this._transactionConnection;
			}
			else callback(new Error('Cannot commit transaction. no active transaction!'));
		}


 
		, rollback: function(callback) {
			if (this._transactionConnection) {
				this._transactionConnection.rollback(callback);
				delete this._transactionConnection;
			}
			else callback(new Error('Cannot rollback transaction. no active transaction!'));
		}




		, _getTransactionConnection: function(callback, instance) {
			if (instance._transactionConnection) {
				log.warn('returning cached');
				callback(null, instance._transactionConnection);
			}
			else {
				log.warn('getting new');
				this._db.getConnection(false, function(err, connection){
					if (err) callback(err);
					else {
						instance._transactionConnection = connection;
						instance._transactionConnection.startTransaction();

						callback(null, instance._transactionConnection);
					}
				}.bind(this));
			}
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
							this._dbNames.push(databaseName);
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
	
		
	ORM.__proto__ = staticORM;
	
	module.exports = ORM;
	
}();
