!function(){

	var   Class 		= require('ee-class')
		, EventEmitter 	= require('ee-event-emitter')
		, log 			= require('ee-log');




	module.exports = new Class({

		init: function(options) {
			this.filter 		= options.filter || {};
			this.select 		= options.select || [];
			this.from 			= options.from || 'undefined';
			this.database 		= options.database || 'undefined';
			this.subresources 	= options.subresources || [];
			this.join 			= options.join || [];
		}
	});
}();
