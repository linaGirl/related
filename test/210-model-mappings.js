(function() {
    'use strict';


    let Class           = require('ee-class');
    let log             = require('ee-log');
    let assert          = require('assert');
    let type            = require('ee-types');


    let getDB           = require('./lib/getDB');


       
    
    describe('Model Mappings', function(done) {
        it('the getters should work', function() {            
            getDB().then((db) => {
                assert.equal(type(new db.event({}).image), 'object');

                done();
            }).catch(done);
        });
    });
})();
