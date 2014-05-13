!function(){

    var   Class         = require('ee-class')
        , log           = require('ee-log')
        , type          = require('ee-types');




    module.exports = new Class({


        alias: function(){
            var   len           = arguments.length
                , tableName     = len === 3 ? arguments[1] : null
                , columnName    = arguments[len === 3 ? 2 : 1]
                , alias         = arguments[0];


            return function(){
                return {
                      table     : tableName
                    , column    : columnName
                    , alias     : alias
                }
            };
        }



        , or: function(){
            var a = Array.prototype.slice.call(arguments);
            a.mode = 'or';
            return a;
        }

        , and: function(){
            var a = Array.prototype.slice.call(arguments);
            a.mode = 'and';
            return a;
        }


        , in: function(values) {
            return function(){
                return {
                      fn: 'in'
                    , values: values
                };
            };
        }


        , notIn: function(values) {
            return function(){
                return {
                      fn: 'notIn'
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


        , gt: function(value) {
            return function(){
                return {
                      operator: '>'
                    , value: value
                }
            }
        }
        , gte: function(value) {
            return function(){
                return {
                      operator: '>='
                    , value: value
                }
            }
        }


        , lt: function(value) {
            return function(){
                return {
                      operator: '<'
                    , value: value
                }
            }
        }
        , lte: function(value) {
            return function(){
                return {
                      operator: '<='
                    , value: value
                }
            }
        }


        , not: function(value) {
            return function(){
                return {
                      operator: 'not'
                    , value: value
                }
            }
        }

        , is: function(value) {
            return function(){
                return {
                      operator: 'is'
                    , value: value
                }
            }
        }
    });




    
}();
