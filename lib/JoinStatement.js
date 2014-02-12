!function(){

	var   Class 		= require('ee-class')
		, EventEmitter 	= require('ee-event-emitter')
		, log 			= require('ee-log');




	module.exports = new Class({

		unformatted: true

		, init: function(options) {
			this.type 		= options.type || 'inner';
			this.source 	= options.source;
			this.target 	= options.target;
		}



		, reverseFormat: function(aliasSuffix) {
			return {
				  type 		: this.type
				, source 	: this.target
				, target 	: this.source
				, alias 	: this.source.table + (aliasSuffix || '')
			};
		}


		, format: function(aliasSuffix) {
			return {
				  type 		: this.type
				, source 	: this.source
				, target 	: this.target
				, alias 	: this.target.table + (aliasSuffix || '')
			};
		}
	});
}();
