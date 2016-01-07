(function() {
    'use strict';


    let Class           = require('ee-class');
    let log             = require('ee-log');
    let assert          = require('assert');
    let type            = require('ee-types');


    let getDB           = require('./lib/getDB');


       
    
    describe('Model Mappings', function(done) {
        it('getters for mappings should work', function(done) {            
            getDB().then((db) => {
                assert.equal(type(new db.event({}).image), 'object');

                done();
            }).catch(done);
        });

        it('getters for not existing mappings should not work', function(done) {            
            getDB().then((db) => {
                assert.equal(type(new db.event({}).fantasyItem), 'undefined');
                
                done();
            }).catch(done);
        });

        it('adding model items to a mapping should work', function(done) {            
            getDB().then((db) => {
                let mapping = new db.event({}).image;

                assert.equal(type(mapping.add(new db.event_image())), 'object');
                assert(type(mapping[0]), 'object');
                
                done();
            }).catch(done);
        });
    });
})();
