(function() {
    'use strict';


    let Class       = require('ee-class');
    let type        = require('ee-types');
    let log         = require('ee-log');



    

    module.exports = new Class({


        /**
         * set up the related orm
         */
        init: function(options) {

            // store db reference and definition
            Class.define(this, 'database', Class(options.database));
            Class.define(this, 'definintion', Class(options.definintion));

        }

    });
})();
