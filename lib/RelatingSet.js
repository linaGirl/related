!function(){

	var   Class 		= require('ee-class')
		, type 			= require('ee-types')
		, async 		= require('ee-async')
		, arg 			= require('ee-arguments')
		, log 			= require('ee-log');



	var proto = Array.prototype;



	var RelatingPrototype = Object.create(proto, {

		// queries beeing executed
		_workers: {
			  get: function(){ return this._workerCount;}
			, set: function(value) {
				this._workerCount = value;
				if (value === 0) this.emit('idle');
			}
		}


		// save changes on the
		, save: {value: function() {
			var   callback 		= arg(arguments, 'function', function(){})
				, noReload 		= arg(arguments, 'boolean', false)
				, transaction 	= arg(arguments, 'object');

			if (transaction) {
				this._save(transaction, noReload, callback);
			}
			else {
				transaction = this.getDatabase().createTransaction();

				this._save(transaction, noReload, function(err){
					if (err) {
						transaction.rollback(function(transactionErr){
							if (transactionErr) callback(transactionErr);
							else callback(err);
						}.bind(this));
					}
					else {
						transaction.commit(function(err){
							if (err) callback(err);
							else callback(null, this);
						}.bind(this));
					}
				}.bind(this));
			}

			return this;
		}}


		// save changes on the
		, _save: {value: function(transaction, noReload, callback) {
			// wait until the relatingset is idle, then store all records and create relations
			if (this._error) callback(this._error);
			else {
				if (this._workers) {
					this.once('idle', function(){
						this._executeSave(transaction, noReload, callback);
					}.bind(this));
				}
				else {
					this._executeSave(transaction, noReload, callback);
				}
			}
		}}

		

		, _executeSave: {value: function(transaction, noReload, callback) {
			// check for query items
			var queries = [];

			for (var i = 0; i < this.length; i++) {
				if (this[i].isQuery) {
					queries.push(proto.splice.call(this, i, 1)[0]);
					i--;
				}
			}

			// execute all queries
			async.each(queries, function(query, next){
				this._addQueryItem(item, next);
			}.bind(this), function(err){
				if (err) callback(err);
				else {
					// save all unsaved items
					async.each(this, function(item, next){
						if (item.isQuery) {
							this._addQueryItem(item, next);
						}
						else if (!item.isFromDatabase() || !item.isSaved()) {
							// we have to save this item before we can proceed
							// if we're a belongs to set we need to set our id on the item

							if (!this.isMapping) {
								item[this._definition.targetColumn] = this._relatesTo[this._column.name];
								item[this._relatesTo.getDefinition().name] = this._relatesTo;
							}
							item.save(transaction, noReload, next);
						}
						else next();
					}.bind(this), function(err){
						if (err) callback(err);
						else {
							// scan for changes
							var   removed 		= []
								, added 		= []
								, originalMap 	= this._createMap(this._originalRecords)
								, currentMap 	= this._createMap(this);

							// adde items
							Object.keys(currentMap).forEach(function(newItemKey){
								if (!originalMap[newItemKey]) {
									// new item
									added.push(currentMap[newItemKey]);
								}
							}.bind(this));

							// removed items
							Object.keys(originalMap).forEach(function(oldItemKey){
								if (!currentMap[oldItemKey]) {
									// new item
									removed.Push(originalMap[oldItemKey]);
								}
							}.bind(this));

							// create / remove relational records
							async.wait(function(done){
								this._deleteRelationRecords(removed, transaction, noReload, done);
							}.bind(this), function(done){
								this._createRelationRecords(added, transaction, noReload, done);
							}.bind(this), callback);
						}
					}.bind(this));
				}
			}.bind(this));
		}}



		, _createRelationRecords: { value: function(addedRecords, transaction, noReload, callback) {

			//return log(addedRecords.length, this._relatesTo, this._column, this._definition);

			async.each(addedRecords, function(record, next){
				if (this.isMapping) {
					var values = {};

					values[this._definition.via.fk] = this._relatesTo[this._column.name];
					values[this._definition.via.otherFk] = model[this._definition.column.name];

					new this._orm[this._database][this._definition.via.model.name](values).save(transaction, next);
				} 
				else next();
			}.bind(this), callback);			
		}}


		, _deleteRelationRecords: {value: function(removedRecords, transaction, noReload, callback) {

			//return log(removedRecords.length, this._relatesTo, this._column, this._definition );

			async.each(removedRecords, function(record, next){
				if (this.isMapping) {
					var values = {};

					values[this._definition.via.fk] = this._relatesTo[this._column.name];
					values[this._definition.via.otherFk] = model[this._definition.column.name];

					transaction[this._definition.via.model.name](values).delete(next)
				}
				else next();
			}.bind(this), callback);	
		}}





		, _createMap: {value: function(items){
			var   map = {}
				, primaryKeys = this._relatesTo.getDefinition().primaryKeys;

			items.forEach(function(item){
				var compositeKey = '';

				primaryKeys.forEach(function(key){
					compositeKey += '|'+item[key];
				}.bind(this), '');

				map[compositeKey] = item;
			});

			return map;
		}}


/*

		// reload all records
		, reload: {value: function(callback) {
			// get all records from the database. discards all data that was
			// modified but not stored before

			//this._errors = [];
		}}

*/

		/*
		 * the push() method accepts eiteher a quer or a saved or not saved
		 * model of the target entity. if it gets a query it execute it immediatelly 
		 * in order to get the records which it shoudl link. it wil lpush all models 
		 * added or found via query to the _addedRecords array which will be stored /
		 * linked when the save method gets calleds
		 *
		 * @param <Object> item: query or model
		 * @param <Function> callback
		 */
		, push: { value: function push (item, callback) {
			if (type.object(item)) { 
				// check if the item is a model or a query
				if (item.isQuery) {
					// execute the query, add it to
					this._addQueryItem(item, callback);
				}
				else {
					if (this._isCorrectType(item)){
						proto.push.call(this, item);
						if (callback) callback(null, this.length);
					}
					else {
						this._error = new Error('Attempt to add models of type «'+item.getName()+'» to a relatingset of type «'+this._definition.name+'» via a query!');
						if (callback) callback(this._error);
					}
				}
			}
			else {
				this._error = new Error('Push was called with an invalid value: «'+type(item)+'»')
				if (callback) callback(this._error);
			}

			return this.length;
		}}




		, splice: {value:function(index, howMany) {
			var   newItems 		= proto.slice.call(arguments, 2)
				, removedItems 	= proto.splice.call(this, index, howMany)
				, callback 		= arg(arguments, 'function');

			// remove the callback if present
			if (callback) newItems.pop();

			if (newItems.length) {
				asyn.each(newItems, function(item, next){
					if (type.object(item)) { 
						if (item.isQuery) this._addQueryItem(item, next, index);
						else {
							if (this._isCorrectType(item)) {
								proto.splice.call(this, index, 0, item);
								next();
							}
							else {
								this._error = new Error('Attempt to add models of type «'+item.getName()+'» to a relatingset of type «'+this._definition.name+'»!');
								next(this._error);
							}
						}
					}
					else {
						this._error = new Error('Push was called with an invalid value: «'+type(item)+'»')
						next(this._error);
					}
				}.bind(this)

				, function(err){
					if (err) {
						this._error = err;
						callback(err, removedItems);
					}
					else callback(null, removedItems);
				}.bind(this));
			}
			else {
				if (callback) callback(null, removedItems);
			}

			return removedItems;
		}}




		, unshift: {value: function(item, callback){
			if (type.object(item)) { 
				// check if the item is a model or a query
				if (item.isQuery) {
					// execute the query, add it to
					this._addQueryItem(item, callback, null, true);
				}
				else {
					if (this._isCorrectType(item)){
						proto.unshift.call(this, item);
						if (callback) callback(null, this.length);
					}
					else {
						this._error = new Error('Attempt to add models of type «'+item.getName()+'» to a relatingset of type «'+this._definition.name+'»!');
						if (callback) callback(this._error);
					}
				}
			}
			else {
				this._error = new Error('Unshift was called with an invalid value: «'+type(item)+'»')
				if (callback) callback(this._error);
			}

			return this.length;
		}}




		, _addQueryItem: {value: function(item, callback, index, unshift){
			this._workers++;

			item.find(function(err, records){
				var err;

				this._workers--;

				if (err) {
					if (callback) callback(err);
				}
				else {
					records.forEach(function(model){
						if (this._isCorrectType(model)){
							if (type.number(index)) proto.splice.call(this, index, 0, model);
							else if (unshift) proto.unshift.call(this, model);
							else proto.push.call(this, model);
						}
						else {
							err = this._error = new Error('Attempt to add models of type «'+model.getName()+'» to a relatingset of type «'+this._definition.name+'» via a query!');
						}
					}.bind(this));

					if (callback) callback(err, this.length);									
				}
			}.bind(this));
		}}



		// internal only method for adding records which were already mappend to the collection
		, addExisiting: { value: function(item){
			this._originalRecords.push(item);
			proto.push.call(this, item);
		}}


		// check if a model is typeof this
		, _isCorrectType: { value: function(model){
			return model.getEntityName() === this._definition.model.name;
		}}




		, pop: { value: function pop () {
			pop.parent();
		}}



		, shift: { value: function shift () {
			shift.parent();
		}}


		, unshift: { value: function unshift () {
			unshift.parent();
		}}



		// inheriting from the array type, have to implement event by myself
		, _events: {value: {}, writable: true}

		// on
		, on: {value: function(evt, listener){
			if (!this._events[evt]) this._events[evt] = [];
			this._events[evt].push({fn: listener});
		}}

		// once
		, once: {value: function(evt, listener){
			if (!this._events[evt]) this._events[evt] = [];
			this._events[evt].push({fn: listener, once: true});
		}}

		// emit
		, emit: {value: function(evt){
			var rm = [];

			if (this._events[evt]) {
				this._events[evt].forEach(function(listener){
					listener.fn.apply(null, Array.prototype.slice.call(arguments, 1));
					if (listener.once) rm.push(listener);
				});

				rm.forEach(function(listener){
					this.off(evt, listener);
				});
			}
		}}

		// off
		, off: {value: function(evt, listener){
			var index;

			if (evt === undefined) this._events = {};
			else if (evt) {
				if (listener === undefined) delete this._events[evt];
				else if(this._events[evt]) {
					index = this._events[evt].indexOf(listener);
					if (index >= 0) this._events[evt].splice(index, 1);
				}
			}
		}}

		, toJSON: {value: function() {
			return Array.prototype.slice.call(this);
		}}

	});






	module.exports = function(options){
		
		return Object.create(RelatingPrototype, {

			_orm: {
				value: options.orm
			}

			, _definition: {
				value: options.definition
			}

			, _relatesTo: {
				value: options.related
			} 
			
			, _column: {
				value: options.column
			}

			, _database: {
				value: options.database
			}

			, _workerCount: {
				value: 0
			}

			// the records which were on the collection when it was initialized
			, _originalRecords: {
				value: []
			}
			// collect errors when selecting records to add to this set
			, _error: {
				value: null
			}

			, isMapping: {
				value: !!options.isMapping
			}		
		});
	};
}();
