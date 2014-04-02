!function(){

	var   Class 		= require('ee-class')
		, type 			= require('ee-types')
		, async 		= require('ee-async')
		, log 			= require('ee-log');



	module.exports = function(options){
		var proto = Array.prototype;


		return Object.create(Array.prototype, {

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

			// all records that were added to the colelction
			, _addedRecords: {
				value: []
			}


			// all records that were removed from the collection
			, _removedRecords: {
				value: []
			}

			// busy flag
			, _isBusy: {
				value: false
			}

			// collect errors when selecting records to add to this set
			, _errors: {
				value: []
			}



			// save changes on the
			, save: {value: function() {
				// TODO: get transaction, store stuff uing _save
			}}


			// save changes on the
			, _save: {value: function(connection, noReload, callback) {
				// wait until the relatingset is idle, then store all records and create relations
				if (this._errors.length) {
					callback(this.errors[0]);
				}
				else {
					if (this._isBusy) {
						this.once('idle', function(){
							this._executeSave(connection, noReload, callback);
						}.bind(this));
					}
					else {
						this._executeSave(connection, noReload, callback);
					}
				}
			}}


			, _executeSave: {value: function(connection, noReload, callback) {

				async.wait(function(done){
					// delete all deleted relating records
					async.each(this._removedRecords, function(model, next){
						this._deleteRelationRecords(connection, model, next);
					}.bind(this), done);
				}.bind(this), function(done){
					// create new relating records
					async.each(this._removedRecords, function(model, next){
						if (model.isSaved()) next(null, model);
						else model.save(next);
					}.bind(this), function(model, next){
						this._createRelationRecords(connection, model, next);
					}.bind(this), done);
				}.bind(this), function(err){

				}.bind(this));




			}}



			// reload all records
			, reload: {value: function(callback) {
				// get all records from the database. discards all data that was
				// modified but not stored before

				this._errors = [];
			}}


			// marks the relatingset as idle (not executing select queries)
			, _idle: {value: function(err) {
				if (err) this._errors.push(err);
				this._isBusy = false;
				this.emit('idle');
			}}

			// the the relatinset as busy (currently fetching records to add to this relation)
			, _busy: {value: function() {
				this._isBusy = true;
				this.emit('busy');
			}}


			// push all records
			, push: { value: function push (item, callback) {
				callback = callback || function(){};

				// check if the item is a model or a query
				if (item.isQuery) {
					this._busy();
					// execute the query, add it to
					item.find(function(err, records){
						this._idle(err);

						if (err) callback(err);
						else {
							records.forEach(function(model){
								var err;

								// TODO: proper typechek
								if (this._isCorrectType(model)){
									push.parent(model);
									this._addedRecords.push(model);
								}
								else {
									// empty array
									records.splice(0, records.length);

									err = new Error('Attempt to add models of type «'+model.getName()+'» to a relatingset of type «'+this._definition.name+'» via a query!');

									if (callback) callback(err);
									else this._errors.push(err);
								}
							}.bind(this));
						}
					}.bind(this));
				}
				else {
					// TODO: proper typechek
					if (this._isCorrectType(model)){
						push.parent(model);
						this._addedRecords.push(model);
						callback();
					}
					else {
						err = new Error('Attempt to add models of type «'+model.getName()+'» to a relatingset of type «'+this._definition.name+'» via a query!');

						if (callback) callback(err);
						else this._errors.push(err);
					}
				}
			}}




			, addExisiting: { value: function(item){
				proto.push.call(this, item);
			}}


			, _isCorrectType: { value: function(model){
				return model.getEntityName() === this._definition.model.name;
			}}



			, _createRelationRecords: { value: function(connection, model, callback) {
				var values = {};

				values[this._definition.via.fk] = this._relatesTo[this._column.name];
				values[this._definition.via.otherFk] = model[this._definition.column.name];

				new this._orm[this._database][this._definition.via.model.name](values).save(connection, callback);
			}}


			, _deleteRelationRecords: {value: function(connection, model, callback) {
				var values = {};

				values[this._definition.via.fk] = this._relatesTo[this._column.name];
				values[this._definition.via.otherFk] = model[this._definition.column.name];

				this._orm[this._database][this._definition.via.model.name](values).delete(connection, callback);
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

		});
	};
}();
