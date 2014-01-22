!function(){

	var   Class 		= require('ee-class')
		, log 			= require('ee-log');


	module.exports = new Class({

		in: function(values){
			return function(){
				return {
					  fn: 'in'
					, values: values
				};
			};
		}
	});
}();
