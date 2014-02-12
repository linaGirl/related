!function(){

	var   Class 		= require('ee-class')
		, log 			= require('ee-log')
		, type 			= require('ee-types');




	module.exports = new Class({


		alias: function(){
			var   len 			= arguments.length
				, tableName 	= len === 3 ? arguments[1] : null
				, columnName 	= arguments[len === 3 ? 2 : 1]
				, alias 	 	= arguments[0];


			return function(){
				return {
				  	  table 	: tableName
				  	, column 	: columnName
				  	, alias 	: alias
				}
			};
		}

		, in: function(values) {
			return function(){
				return {
					  fn: 'in'
					, values: values
				};
			};
		}


		, notNull: function() {
			return function(){
				return {
					fn: 'notNull'
				};
			};
		}
	});




	
}();
