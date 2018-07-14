(function() {
    'use strict';

    const Class                 = require('ee-class');
    const log                   = require('ee-log');
    const type                  = require('ee-types');
    const Model                 = require('./Model');
    const AdvancedQueryBuilder  = require('./AdvancedQueryBuilder');
    const FullTextQueryBuilder  = require('./FullTextQueryBuilder');




    const Helpers = new Class({
        fn:  function(fn, values, alias, isAggregate) {
            const selection = function() {
                return {
                      fn        : fn
                    , values    : values
                    , value     : values
                    , alias     : alias
                    , isAggregate: !!isAggregate
                };
            };

            selection.isAggregate = !!isAggregate;

            return selection;
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
    const helpers = new Helpers();




    module.exports = new Class({

        // alias
        alias: function(){
            var   len           = arguments.length
                , tableName     = len === 3 ? arguments[1] : null
                , columnName    = arguments[len === 3 ? 2 : 1]
                , alias         = arguments[0];


            return function() {
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


        // nil is used when filtering nullable columns on left joins. it
        // matches all rows that aren't set. null filters rows that are set
        // but have the actual value null (on nullable columns)
        , nil: Symbol('nil')


        // use a keyword in a select (non escaped string)
        , keyword: function(keyword) {
            return function() {
                return {
                    keyword: keyword
                };
            };
        }

        //reference to other table, col
        , reference: function(entity, column) {
            return function() {
                return {
                      fn: 'reference'
                    , entity: entity
                    , column: column
                };
            };
        }



        // let the user call functions
        , function: (functionName, args, alias) => {
            return () => ({
                  functionName  : functionName
                , args          : args
                , alias         : alias
            })
        }



        // aggregate functions
        , count: function(field, alias) {
            return helpers.fn('count', field, alias, true);
        }
        , max: function(field, alias) {
            return helpers.fn('max', field, alias, true);
        }
        , min: function(field, alias) {
            return helpers.fn('min', field, alias, true);
        }
        , avg: function(field, alias) {
            return helpers.fn('avg', field, alias, true);
        }
        , sum: function(field, alias) {
            return helpers.fn('sum', field, alias, true);
        }



        , len: function(field, alias) {
            return helpers.fn('length', field, alias);
        }


        // value updates
        , increaseBy: function(amount) {
            return helpers.fn('increaseBy', amount);
        }
        , decreaseBy: function(amount) {
            return helpers.fn('decreaseBy', amount);
        }


        // filters
        , like: function(value) {
            return helpers.fn('like', value);
        }
        , notLike: function(value) {
            return helpers.fn('notLike', value);
        }


        , jsonValue: function(path, value) {
            return function() {
                return {
                      fn        : 'jsonValue'
                    , rightSide : true
                    , path      : path
                    , value     : value
                };
            };
        }


        , in: function(values) {
            return helpers.fn('in', type.array(values) ? values : Array.prototype.slice.call(arguments));
        }
        , notIn: function(values) {
            return helpers.fn('notIn', type.array(values) ? values : Array.prototype.slice.call(arguments));
        }
        , notNull: function() {
            return helpers.fn('notNull');
        }
        , isNull: function() {
            return helpers.fn('null');
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

         /*
         * return a new advanced querybuilder instance
         */
        , createQueryBuilder: function(query) {
            return new AdvancedQueryBuilder(query);
        }

        /*
         * return a new advanced querybuilder instance
         */
        , qb: function(query) {
            return new AdvancedQueryBuilder(query);
        }

        /*
         * return a new advanced querybuilder instance
         */
        , queryBuilder: function(query) {
            return new AdvancedQueryBuilder(query);
        }



        , fulltext: function(language) {
            return new FullTextQueryBuilder(language);
        }


        // the model, needed for extending models
        , Model: Model
    });
})();
