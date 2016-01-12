(function() {
    'use strict';


    let log             = require('ee-log');
    let assert          = require('assert');
    let type            = require('ee-types');


    let getDB           = require('./lib/getDB');
    let FakeQuery       = require('./lib/FakeQuery');


       
    
    describe('Model Sets', function() {
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





        it('ModelSet.add() adding query builder items to a mapping', function(done) {            
            getDB().then((db) => {
                let mapping = new db.event({}).image;

                assert.equal(type(mapping.add(new FakeQuery())), 'object');
                assert(type(mapping[0]), 'undefined');
                
                done();
            }).catch(done);
        });

        it('ModelSet.add() adding model items to a mapping', function(done) {            
            getDB().then((db) => {
                let mapping = new db.event({}).image;

                assert.equal(type(mapping.add(new db.image())), 'object');
                assert(type(mapping[0]), 'object');
                
                done();
            }).catch(done);
        });

        it('ModelSet.add() adding model items to a mapping that are the wrong model', function(done) {            
            getDB().then((db) => {
                let mapping = new db.event({}).image;

                assert.throws(() => {
                    mapping.add(new db.event_image());
                });
                
                done();
            }).catch(done);
        });

        it('ModelSet.add() adding model items to a mapping that are the wrong type', function(done) {            
            getDB().then((db) => {
                let mapping = new db.event({}).image;

                assert.throws(() => {
                    mapping.add({});
                });
                
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

        it('ModelSet.delete() deleting model item from mapping that not exists', function(done) {            
            getDB().then((db) => {
                assert.equal(new db.event({}).image.delete(new db.image()), false);                
                done();
            }).catch(done);
        });

        it('ModelSet.delete() deleting query builder item from mapping that not exists', function(done) {            
            getDB().then((db) => {
                assert.equal(new db.event({}).image.delete(new FakeQuery()), false);                
                done();
            }).catch(done);
        });

        it('ModelSet.delete() deleting item from mapping with the wrong type', function(done) {            
            getDB().then((db) => {

                assert.throws(() => {
                    new db.event({}).image.delete(1);
                });
                
                done();
            }).catch(done);
        });

        it('ModelSet.delete() removing query builder items from a mapping using the items pointer', function(done) {            
            getDB().then((db) => {
                let mapping = new db.event({}).image;
                let img = new FakeQuery();

                mapping.add(img);
                assert.equal(mapping.size, 0);
                assert.equal(mapping.delete(img), true);
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

                mapping[0] = img;
                assert.equal(mapping[0], img);
                assert.equal(mapping.size, 1);
                
                done();
            }).catch(done);
        });

        it('ModelSet[index] setting an item using an index which is a string', function(done) {            
            getDB().then((db) => {
                let mapping = new db.event({}).image;
                let img = new db.image();

                mapping['0'] = img;
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





        it('ModelSet.has() invalid item', function(done) {            
            getDB().then((db) => {

                assert.throws(() => {
                    new db.event({}).image.has({});
                });
                
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



        
        it('ModelSet.entries() iterating over all models of the set', function(done) {            
            getDB().then((db) => {
                let mapping = new db.event({}).image;
                let img = new db.image({url: 'a'});
                let img2 = new db.image({url: 'b'});

                mapping.add(img);
                mapping.add(img2);

                assert.deepEqual(Array.from(mapping.entries()), [
                      {url: "a"}
                    , {url: "b"}
                ]);
                
                done();
            }).catch(done);
        });






        
        it('ModelSet.isDirty() on a new set', function(done) {            
            getDB().then((db) => {
                let mapping = new db.event({}).image;
                assert.equal(mapping.isDirty(), false);
                
                done();
            }).catch(done);
        });
        
        it('ModelSet.isDirty() on a set with new models', function(done) {            
            getDB().then((db) => {
                let mapping = new db.event({}).image;
                let img = new db.image({url: 'a'});

                mapping.add(img);
                assert.equal(mapping.isDirty(), true);
                
                done();
            }).catch(done);
        });
        
        it('ModelSet.isDirty() on a cleared set', function(done) {            
            getDB().then((db) => {
                let mapping = new db.event({}).image;
                mapping.clear();
                assert.equal(mapping.isDirty(), true);
                
                done();
            }).catch(done);
        });





        it('x in ModelSet with an existing property', function(done) {
            getDB().then((db) => {
                let model = new db.event();
                let mapping = model.image;
                mapping.add(new db.image());
                
                assert.equal('0' in mapping, true);

                done();
            }).catch(done);
        });

        it('x in ModelSet with a non existing property', function(done) {
            getDB().then((db) => {
                let model = new db.event();
                let mapping = model.image;
                
                assert.equal('0' in mapping, false);

                done();
            }).catch(done);
        });

        it('x in ModelSet with a method', function(done) {
            getDB().then((db) => {
                let model = new db.event();
                let mapping = model.image;
                
                assert.equal('has' in mapping, false);

                done();
            }).catch(done);
        });
    });
})();
