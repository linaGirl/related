(function() {
    'use strict';


    let log       = require('ee-log');




    module.exports = class FakeConnection{




        createTransaction() {
            return Promise.resolve();
        }
    };
})();
