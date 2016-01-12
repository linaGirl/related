(function() {
    'use strict';


    let log             = require('ee-log');
    let assert          = require('assert');
    let type            = require('ee-types');


    let getDB           = require('./lib/getDB');
    let FakeQuery       = require('./lib/FakeQuery');


       
    
    describe('Transactions', function() {
        it('creating a transaction', function(done) {            
            getDB().then((db) => {
                assert.equal(type(new db.event({}).image), 'object');

                done();
            }).catch(done);
        });
    });
})();
