(function() {
    'use strict';


    let log             = require('ee-log');
    let assert          = require('assert');
    let type            = require('ee-types');


    let getDB           = require('./lib/getDB');




    
    describe('Query Builder', function() {

        it('entity().find() without any input', function(done) {
            getDB().then((db) => {
                return db.event().find().then(() => {
                    done();
                });
            }).catch(done);
        });
    });
})();
