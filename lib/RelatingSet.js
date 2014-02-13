!function(){

	var   Class 		= require('ee-class')
		, type 			= require('ee-types')
		, log 			= require('ee-log');



	module.exports = function(options){
		var proto = Array.prototype;

		//log.warn('new relatingset', options.definition.name);

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



			, push: { value: function push (item, callback) {
				callback = callback || function(){};

				if (item && type.boolean(item.isFromDatabase())){
					if (item.isFromDatabase()){
						// ready to make relation
						this._createRelationRecords(item, callback);
					}
					else {
						// sore item first
						item.save(function(err){
							if (err) callback(err);
							else this._createRelationRecords(item, callback);
						}.bind(this));
					}
				}
				else callback(new Error('Cannot add item to the relating set!'));
			}}



			, addExisiting: { value: function(item){
				proto.push.call(this, item);
			}}



			, _createRelationRecords: { value: function(item, callback){
				var values = {};

				values[this._definition.via.fk] = this._relatesTo[this._column.name];
				values[this._definition.via.otherFk] = item[this._definition.column.name];

				new this._orm[this._database][this._definition.via.model.name](values).save(function(err, relation){
					if (err) callback(err);
					else {
						proto.push.call(this, item);
						callback(null, item);
					}
				}.bind(this));			
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
		});
	};
}();
