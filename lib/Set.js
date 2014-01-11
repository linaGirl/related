!function(){

	var   Class 		= require('ee-class')
		, type 			= require('ee-types')
		, log 			= require('ee-log');



	module.exports = new Class({
		inherits: Array

		
		, first: function(){
			return this[0];
		}

		, last: function(){
			return this.length ? this[this.length-1] : undefined;
		}


		, getIds: function(){
			return this.map(function(item){ return item.id;});
		}
	});
}();
