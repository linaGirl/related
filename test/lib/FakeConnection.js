(function() {
    'use strict';


    let Class     = require('ee-class');
    let log       = require('ee-log');




    module.exports = new Class({




        createTransaction: function() {
            return Promise.resolve();
        }
    });
})();
