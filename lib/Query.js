!function(){

    var   Class         = require('ee-class')
        , EventEmitter  = require('ee-event-emitter')
        , log           = require('ee-log');




    module.exports = new Class({

        init: function(options) {
            this.filter         = options.filter || {};
            this.select         = options.select || [];
            this.from           = options.from || 'undefined';
            this.database       = options.database || 'undefined';
            this.join           = options.join || [];
            this.group          = options.group || [];
        }
        

        , addSeleted: function(select) {
            this.select = this.select.concat(select);
        }



        , formatJoins: function() {
            this.join = this.join.map(function(join){
                return join.unformatted ? join.format() : join;
            });
        }
    });
}();
