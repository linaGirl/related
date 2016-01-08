(function() {
    'use strict';


    let Class           = require('ee-class');
    let log             = require('ee-log');
    let assert          = require('assert');
    let type            = require('ee-types');


    let getDB           = require('./lib/getDB');


       
    
    describe('Model Mappings', function() {
        it('getters for mappings', function(done) {            
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




        it('ModelSet.add() adding model items to a mapping', function(done) {            
            getDB().then((db) => {
                let mapping = new db.event({}).image;

                assert.equal(type(mapping.add(new db.event_image())), 'object');
                assert(type(mapping[0]), 'object');
                
                done();
            }).catch(done);
        });

        it('ModelSet.delete() removing model items from a mapping using the items pointer', function(done) {            
            getDB().then((db) => {
                let mapping = new db.event({}).image;
                let img = new db.image();

                mapping.add(img);
                assert.equal(mapping.size, 1);
                mapping.delete(img);
                assert.equal(mapping.size, 0);
                
                done();
            }).catch(done);
        });




        it('ModelSet.length getting the length', function(done) {            
            getDB().then((db) => {
                let mapping = new db.event({}).image;

                assert.equal(mapping.length, 0);
                mapping.add(new db.image());
                assert.equal(mapping.length, 1);
                
                done();
            }).catch(done);
        });

        it('ModelSet.size getting the size', function(done) {            
            getDB().then((db) => {
                let mapping = new db.event({}).image;

                assert.equal(mapping.size, 0);
                mapping.add(new db.image());
                assert.equal(mapping.size, 1);
                
                done();
            }).catch(done);
        });



        it('ModelSet[index] getting an item by its index', function(done) {            
            getDB().then((db) => {
                let mapping = new db.event({}).image;
                let img = new db.image();
                mapping.add(img);

                assert.equal(mapping[0], img);
                
                done();
            }).catch(done);
        });

        it('ModelSet[index] getting an item by its index which is a string', function(done) {            
            getDB().then((db) => {
                let mapping = new db.event({}).image;
                let img = new db.image();
                mapping.add(img);

                assert.equal(mapping['0'], img);
                
                done();
            }).catch(done);
        });

        it('ModelSet[index] getting an item by an invalid index', function(done) {            
            getDB().then((db) => {
                let mapping = new db.event({}).image;
                let img = new db.image();
                mapping.add(img);

                assert.equal(mapping[1], undefined);
                
                done();
            }).catch(done);
        });

        it('ModelSet[index] setting an item using an index', function(done) {            
            getDB().then((db) => {
                let mapping = new db.event({}).image;
                let img = new db.image();

                mapping.set(0, img);
                assert.equal(mapping[0], img);
                assert.equal(mapping.size, 1);
                
                done();
            }).catch(done);
        });

        it('ModelSet[index] setting an item using an index which is a string', function(done) {            
            getDB().then((db) => {
                let mapping = new db.event({}).image;
                let img = new db.image();

                mapping.set('0', img);
                assert.equal(mapping[0], img);
                assert.equal(mapping.size, 1);
                
                done();
            }).catch(done);
        });

        it('ModelSet[index] setting an item using an index above the length value', function(done) {            
            getDB().then((db) => {
                let mapping = new db.event({}).image;
                let img = new db.image();

                mapping.set(10, img);
                assert.equal(mapping[10], img);
                assert.equal(mapping.size, 11);
                
                done();
            }).catch(done);
        });




        
        it('ModelSet.has(index) checking for an item at a specific index', function(done) {            
            getDB().then((db) => {
                let mapping = new db.event({}).image;
                let img = new db.image();

                mapping.add(img);
                assert.equal(mapping.has(0), true);
                assert.equal(mapping.has(1), false);
                
                done();
            }).catch(done);
        });
        
        it('ModelSet.has(index) checking for an item at a specific index using a string', function(done) {            
            getDB().then((db) => {
                let mapping = new db.event({}).image;
                let img = new db.image();

                mapping.add(img);
                assert.equal(mapping.has('0'), true);
                assert.equal(mapping.has('1'), false);
                
                done();
            }).catch(done);
        });
        
        it('ModelSet.has(pointer) checking for an item using its pointer', function(done) {            
            getDB().then((db) => {
                let mapping = new db.event({}).image;
                let img = new db.image();
                let img2 = new db.image();

                mapping.add(img);
                assert.equal(mapping.has(img), true);
                assert.equal(mapping.has(img2), false);
                
                done();
            }).catch(done);
        });



        
        it('ModelSet.clear()', function(done) {            
            getDB().then((db) => {
                let mapping = new db.event({}).image;
                let img = new db.image();
                let img2 = new db.image();

                mapping.add(img);
                mapping.add(img2);
                mapping.clear();
                
                assert.equal(mapping.has(img), false);
                assert.equal(mapping.has(img2), false);
                assert.equal(mapping.length, 0);
                
                done();
            }).catch(done);
        });



        
        it('ModelSet.toArray()', function(done) {            
            getDB().then((db) => {
                let mapping = new db.event({}).image;
                let img = new db.image({url: 'a'});
                let img2 = new db.image({url: 'b'});

                mapping.add(img);
                mapping.add(img2);
                
                assert.deepEqual(mapping.toArray(), [
                      {url: "a"}
                    , {url: "b"}
                ]);
                
                done();
            }).catch(done);
        });
    });
})();
