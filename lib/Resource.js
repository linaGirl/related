!function(){

	var   Class 		= require('ee-class')
		, EventEmitter 	= require('ee-event-emitter')
		, log 			= require('ee-log');




	module.exports = new Class({
		init: function(options) {
			this.query = options.query;
		}
	});
}();
