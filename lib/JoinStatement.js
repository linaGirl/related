(function() {
    'use strict';
    var   Class         = require('ee-class')
        , EventEmitter  = require('ee-event-emitter')
        , log           = require('ee-log');




    module.exports = new Class({

        unformatted: true

        , init: function(options) {
            this.type       = options.type || 'inner';
            this.source     = options.source;
            this.target     = options.target;
        }



        , reverseFormat: function(aliasSuffix, secondAliasSuffix, left) {
            return {
                  type          : left ? 'left' : this.type
                , source        : {
                      table     : this.target.table + (secondAliasSuffix === undefined ? '' : secondAliasSuffix)
                    , column    : this.target.column
                }
                , target        : this.source
                , alias         : this.source.table + (aliasSuffix === undefined ? '' : aliasSuffix)
            };
        }


        , format: function(aliasSuffix, secondAliasSuffix, left) {
            return {
                  type          : left ? 'left' : this.type
                , source        : this.source
                , target        : {
                      table     : this.target.table + (secondAliasSuffix === undefined ? '' : secondAliasSuffix)
                    , column    : this.target.column
                }
                , alias         : this.target.table + (aliasSuffix === undefined ? '' : aliasSuffix)
            };
        }


        , _addAlias: function(config, alias) {
            config.table = config.table +(alias === undefined ? '' : alias);
            return config;
        }
    });
})();
