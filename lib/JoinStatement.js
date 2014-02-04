!function(){

	var   Class 		= require('ee-class')
		, EventEmitter 	= require('ee-event-emitter')
		, log 			= require('ee-log');




	module.exports = new Class({
		init: function(options) {
			this.type 				= options.type || 'inner';
			this.ourTableName 		= options.ourTableName;
			this.ourColumnName		= options.ourColumnName;
			this.otherTableName		= options.otherTableName;
			this.otherColumnName	= options.otherColumnName;
		}
	});
}();
