!function(){

    var   Class         = require('ee-class')
        , log           = require('ee-log')
        , type          = require('ee-types');




    var Helpers = new Class({
        fn:  function(fn, values, alias) {
            return function() {
                return {
                      fn        : fn
                    , values    : values
                    , value     : values
                    , alias     : alias
                };
            };
        }

        , operator: function(operator, value) {
            return function() {
                return {
                      operator : operator
                    , value    : value
                };
            };
        }
    });
    var helpers = new Helpers();


    

    module.exports = new Class({
        // alias
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


        // logic
        , or: function(first){
            var a = type.array(first) ? first : Array.prototype.slice.call(arguments);
            a.mode = 'or';
            return a;
        }

        , and: function(first){
            var a = type.array(first) ? first : Array.prototype.slice.call(arguments);
            a.mode = 'and';
            return a;
        }



        // aggregate functions
        , count: function(field, alias) {
            return helpers.fn('count', field, alias);
        }
        , max: function(field, alias) {
            return helpers.fn('max', field, alias);
        }
        , min: function(field, alias) {
            return helpers.fn('min', field, alias);
        }
        , avg: function(field, alias) {
            return helpers.fn('avg', field, alias);
        }
        , sum: function(field, alias) {
            return helpers.fn('sum', field, alias);
        }


        // filters
        , like: function(value) {
            return helpers.fn('like', value);
        }
        , notLike: function(value) {
            return helpers.fn('notLike', value);
        }


        , in: function(values) {
            return helpers.fn('in', values);
        }
        , notIn: function(values) {
            return helpers.fn('notIn', values);
        }
        , notNull: function() {
            return helpers.fn('notNull');
        }


        , equal: function(value) {
            return helpers.operator('=', value);
        }
        , notEqual: function(value) {
            return helpers.operator('!=', value);
        }

        , gt: function(value) {
            return helpers.operator('>', value);
        }
        , gte: function(value) {
            return helpers.operator('>=', value);
        }

        , lt: function(value) {
            return helpers.operator('<', value);
        }
        , lte: function(value) {
            return helpers.operator('<=', value);
        }

        , not: function(value) {
            return helpers.operator('not', value);
        }
        , is: function(value) {
            return helpers.operator('is', value);
        }
    });    
}();
