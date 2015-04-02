!function(){

    var   Class         = require('ee-class')
        , type          = require('ee-types')
        , EventEmitter  = require('ee-event-emitter')
        , log           = require('ee-log')
        , clone         = require('./clone');




    var Query = module.exports = new Class({

        init: function(options) {
            options = options || {};

            this.filter         = options.filter || {};
            this.select         = options.select || [];
            this.from           = options.from || 'undefined';
            this.database       = options.database || 'undefined';
            this.join           = options.join || [];
            this.group          = options.group || [];
            this.order          = options.order || [];
        }
        

        , addSeleted: function(select) {
            this.select = this.select.concat(select);
        }

        /*
         * reset the order statement
         */
        , resetOrder: function() {
            this.order = [];
            return this;
        }

        /*
         * configre the limit
         */
        , setLimit: function(limit) {
            if (type.number(limit)) this.limit = limit;
            else if (limit === null && this.limit) delete this.limit;
            return this;
        }


        /*
         * returns the current offset
         */
        , getOffset: function() {
            return this.offset || 0;
        }


        /*
         * configre the offset
         */
        , setOffset: function(offset) {
            if (type.number(offset)) this.offset = offset;
            else if (offset === null && this.offset) delete this.offset;
            return this;
        }

        /*
         * return a new query instance with cloned objects / arrays
         */
        , clone: function() {
            return new Query({
                  filter    : clone(this.filter)
                , from      : clone(this.from)
                , select    : clone(this.select)
                , database  : clone(this.database)
                , join      : clone(this.join)
                , group     : clone(this.group)
                , order     : clone(this.order)
                , filter    : clone(this.filter)
            });
        }


        /*
         * Return a copy of the filter object
         */
        , cloneFilter: function() {
            return clone(this.filter);
        }

        , formatJoins: function() {
            this.join = this.join.map(function(join){
                return join.unformatted ? join.format() : join;
            });
        }
    });
}();
