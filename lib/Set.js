!function(){

	var   Class 		= require('ee-class')
		, type 			= require('ee-types')
		, log 			= require('ee-log');



	module.exports = new Class({
		inherits: Array


		, init: function(){
			Object.defineProperty(this, '_maps', {value: {}});
		}

		
		, first: function(){
			return this[0];
		}

		, last: function(){
			return this.length ? this[this.length-1] : undefined;
		}


		, getColumnValues: function(column){
			column = column || 'id';

			return this.map(function(row){
				return row[column];
			});
		}


		, getIds: function(){
			return this.map(function(item){ return item.id;});
		}


		, getByColumnValue: function(column, value){
			return this._maps[column] ? this._maps[column][value] : undefined;
		}


		, createMap: function(column){
			if (!this._maps[column]){
				this._maps[column] = {};

				this.forEach(function(item){
					this._maps[column][item[column]] = item;
				}.bind(this));
			}
		}
	});
}();
