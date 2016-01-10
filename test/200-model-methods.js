(function() {
    'use strict';


    let log             = require('ee-log');
    let assert          = require('assert');
    let type            = require('ee-types');


    let getDB           = require('./lib/getDB');
    let FakeQuery       = require('./lib/FakeQuery')
    let Related         = require('../');




    
    describe('Model Methods', function() {


        it('Model.addPublicMethod() Publshing a new public model method', function() {
            Related.Model.addPublicMethod('test');
        });
       


        it('new Model() Instantiating a Model', function(done) {
            getDB().then((db) => {
                new db.event();
                done();
            }).catch(done);
        });

        it('new Model(null) Instantiating a Model with null as input', function(done) {
            getDB().then((db) => {
                new db.event(null);
                done();
            }).catch(done);
        });

        it('new Model(invalid) Instantiating a Model with invalid input', function(done) {
            getDB().then((db) => {

                assert.throws(() => {
                    new db.event(new Set());
                });

                done();
            }).catch(done);
        });

        it('new Model(values) Instantiating a Model with existing properites', function(done) {
            getDB().then((db) => {
                let model = new db.event({
                    title: 'winning!'
                });

                assert.deepEqual(model, {
                    title: "winning!"
                });

                done();
            }).catch(done);
        });

        it('new Model(values) Instantiating a Model with existing properites in form of a map', function(done) {
            getDB().then((db) => {
                let data = new Map();
                data.set('title', 'winning!');

                let model = new db.event(data);

                assert.deepEqual(model, {
                    title: "winning!"
                });

                done();
            }).catch(done);
        });

        it('new Model(values) Instantiating a Model with invalid properites', function(done) {
            getDB().then((db) => {

                assert.throws(() => {
                    new db.event({
                        crap: 'is invalid!'
                    });
                });

                done();
            }).catch(done);
        });

        it('new Model(values) Instantiating a Model with existing properites and values for a mapping', function(done) {
            getDB().then((db) => {
                let model = new db.event({
                      title: 'winning!'
                    , image: [new db.image({
                        url: 'http://crapple.com/'
                    })]
                });

                assert.deepEqual(model, {
                      title: "winning!"
                    , image: {
                        0: {
                            url: "http://crapple.com/"
                        }
                    }
                });

                done();
            }).catch(done);
        });

        it('new Model(values) Instantiating a Model with existing properites and values for a belongs to', function(done) {
            getDB().then((db) => {
                let model = new db.event({
                      title: 'winning!'
                    , event_image: [new db.event_image({
                          id_event: 1
                        , id_image: 1
                    })]
                });

                assert.deepEqual(model, {
                      title: "winning!"
                    , event_image: {
                        0: {
                              id_event: 1
                            , id_image: 1
                        }
                    }
                });

                done();
            }).catch(done);
        });

        it('new Model(values) Instantiating a Model with models for a reference', function(done) {
            getDB().then((db) => {
                let model = new db.event({
                      title: 'winning!'
                    , venue: new db.venue({
                        name: 'Jamie Jones'
                    })
                });

                
                assert.deepEqual(model, {
                      title: "winning!"
                    , venue: {
                        name: "Jamie Jones"
                    }
                });

                done();
            }).catch(done);
        });

        it('new Model(values) Instantiating a Model with a queries for a reference', function(done) {
            getDB().then((db) => {
                let model = new db.event({
                      title: 'winning!'
                    , venue: new FakeQuery(null, [])
                });

                
                assert.deepEqual(model, {
                    title: "winning!"
                });

                done();
            }).catch(done);
        });

        it('new Model(values) Instantiating a Model with invalid values for a reference I', function(done) {
            getDB().then((db) => {

                assert.throws(() => {
                   new db.event({
                          title: 'winning!'
                        , venue: {}
                    });
                });

                done();
            }).catch(done);
        });

        it('new Model(values) Instantiating a Model with invalid values for a reference II', function(done) {
            getDB().then((db) => {

                assert.throws(() => {
                   new db.event({
                          title: 'winning!'
                        , venue: 1
                    });
                });

                done();
            }).catch(done);
        });

        it('new Model(values) Instantiating a Model with the null value for a reference', function(done) {
            getDB().then((db) => {
                let model = new db.event({
                      title: 'winning!'
                    , venue: null
                });

                assert.deepEqual(model, {
                      id_venue: null
                    , title: "winning!"
                });

                assert.equal(model.venue, null);

                done();
            }).catch(done);
        });

        it('new Model(values) Instantiating a Model. Setting a model for a reference, overwriting it with null afterwards', function(done) {
            getDB().then((db) => {
                let model = new db.event({
                    title: 'winning!'
                });

                model.venue = new db.venue();
                model.venue = null;

                assert.deepEqual(model, {
                      id_venue: null
                    , title: "winning!"
                });

                assert.equal(model.venue, null);

                done();
            }).catch(done);
        });

        it('new Model(values) Instantiating a Model. Setting a query for a reference, overwriting it with null afterwards', function(done) {
            getDB().then((db) => {
                let model = new db.event({
                    title: 'winning!'
                });

                model.venue = new FakeQuery();
                model.venue = null;

                assert.deepEqual(model, {
                      id_venue: null
                    , title: "winning!"
                });

                assert.equal(model.venue, null);

                done();
            }).catch(done);
        });

       


        it('Model.isNew() with a newly created model instance', function(done) {
            getDB().then((db) => {
                let model = new db.event({});

                assert.equal(model.isNew(), true);

                done();
            }).catch(done);
            
        });


        it('Model.isNew() with a model populated from the database', function(done) {
            getDB().then((db) => {
                let model = new db.event().populateFromDatabase({
                    title: 'testEvent'
                });

                assert.equal(model.isNew(), false);

                done();
            }).catch(done);
            
        });



        it('Model.isDirty() with a freshly instantiated model', function(done) {
            getDB().then((db) => {
                let model = new db.event();

                assert.equal(model.isDirty(), true);

                done();
            }).catch(done);
        });

        it('Model.isDirty() with a model populated from the database', function(done) {
            getDB().then((db) => {
                let model = new db.event().populateFromDatabase({
                    title: 'testEvent'
                });

                assert.equal(model.isDirty(), false);

                done();
            }).catch(done);
        });



        it('Model.populateFromDatabase() with regular properties', function(done) {
            getDB().then((db) => {
                let model = new db.event().populateFromDatabase({
                    title: 'testEvent'
                });

                assert.equal(model.isNew(), false);
                assert.equal(model.title, 'testEvent');
                assert.equal(model.get('title'), 'testEvent');

                done();
            }).catch(done);            
        });

        it('Model.populateFromDatabase() with reserved properties', function(done) {
            getDB().then((db) => {
                let model = new db.event().populateFromDatabase({
                    get: 'getValue'
                });

                assert.equal(model.isNew(), false);
                assert.equal(type(model.get), 'function');
                assert.equal(model.get('get'), 'getValue');

                done();
            }).catch(done);     
        });

        it('Model.populateFromDatabase() with invalid input', function(done) {
            getDB().then((db) => {
                assert.throws(() => {
                    new db.event().populateFromDatabase(1); 
                });

                done(); 
            }).catch(done);
        });

        it('Model.populateFromDatabase() with no input', function(done) {
            getDB().then((db) => {
                new db.event().populateFromDatabase(); 

                done(); 
            }).catch(done);
        });

        it('Model.populateFromDatabase() with null as input', function(done) {
            getDB().then((db) => {
                new db.event().populateFromDatabase(null); 

                done(); 
            }).catch(done);
        });



        it('Model.get() using normal and reserved properties', function(done) {
            getDB().then((db) => {
                let model = new db.event().populateFromDatabase({
                      get: 'getValue'
                    , title: 'testEvent'
                }, ['get']);

                assert.equal(type(model.get), 'function');
                assert.equal(model.get('get'), 'getValue');
                assert.equal(model.title, 'testEvent');
                assert.equal(model.get('title'), 'testEvent');

                done();
            }).catch(done);
        });

        it('Model.get() a mapped entitiy', function(done) {
            getDB().then((db) => {
                let model = new db.event();

                assert.equal(type(model.get('image')), 'object');

                done();
            }).catch(done);
        });

        it('Model.get() a referenced and uninitialized entity', function(done) {
            getDB().then((db) => {
                let model = new db.event();

                assert.equal(type(model.get('venue')), 'null');

                done();
            }).catch(done);
        });

        it('Model.get() a referenced and initialized entity', function(done) {
            getDB().then((db) => {
                let model = new db.event();
                model.venue = new db.venue();

                assert.equal(type(model.get('venue')), 'object');

                done();
            }).catch(done);
        });

        it('Model.get() with a referenced by entity', function(done) {
            getDB().then((db) => {
                let model = new db.event();

                assert.equal(type(model.get('event_image')), 'object');

                done();
            }).catch(done);
        });

        it('Model.get() a not existing property', function(done) {
            getDB().then((db) => {
                let model = new db.event();

                assert.throws(() => {
                    model.get('a');
                });

                done();
            }).catch(done);
        });




        it('Model.set() with regular properties, setting one twice', function(done) {
            getDB().then((db) => {
                let model = new db.event();

                model.set('get', 'getValue');
                model.set('title', 'testEvent');
                model.set('title', 'testEvent');

                assert.equal(type(model.get), 'function');
                assert.equal(model.get('get'), 'getValue');
                assert.equal(model.title, 'testEvent');
                assert.equal(model.get('title'), 'testEvent');

                done();
            }).catch(done);
        });

        it('Model.set() a not existing property', function(done) {
            getDB().then((db) => {
                let model = new db.event();

                assert.throws(() => {
                    model.set('a', 'getValue');
                });

                done();
            }).catch(done);
        });

        it('Model.set() a reference', function(done) {
            getDB().then((db) => {
                let model = new db.event();
                model.venue = new db.venue();

                assert.equal(type(model.venue), 'object');

                done();
            }).catch(done);
        });

        it('Model.set() a mapping using an array', function(done) {
            getDB().then((db) => {
                let model = new db.event();
                model.image = [new db.image()];

                assert.equal(type(model.image), 'object');

                done();
            }).catch(done);
        });

        it('Model.set() an invalid mapping', function(done) {
            getDB().then((db) => {
                let model = new db.event();

                assert.throws(() => {
                    model.image = new Map();
                });

                done();
            }).catch(done);
        });

        it('Model.set() a mappign usin a set', function(done) {
            getDB().then((db) => {
                let model = new db.event();
                model.image = new Set([new db.image()]);

                assert.equal(type(model.image), 'object');

                done();
            }).catch(done);
        });

        it('Model.set() a belongs to using a set', function(done) {
            getDB().then((db) => {
                let model = new db.event();
                model.event_image = new Set([new db.event_image()]);

                assert.equal(type(model.event_image), 'object');

                done();
            }).catch(done);
        });

        it('Model.set() a belongs to using invalid input', function(done) {
            getDB().then((db) => {
                let model = new db.event();

                assert.throws(() => {
                    model.event_image = new Map();
                });

                done();
            }).catch(done);
        });

        it('Model.set() a belongs to using invalid input', function(done) {
            getDB().then((db) => {
                let model = new db.event();

                assert.throws(() => {
                    model.event_image = new Map();
                });

                done();
            }).catch(done);
        });





        it('Model.columns() Iterating over the models columns', function(done) {
            getDB().then((db) => {
                let model = new db.event({
                    title: 'hi'
                });

                assert.deepEqual(Array.from(model.columns()), [ 'id', 'id_venue', 'title', 'get' ]);

                done();
            }).catch(done);
        });

        it('Model.mappings() Iterating over the models mappings', function(done) {
            getDB().then((db) => {
                let model = new db.event({
                    title: 'hi'
                });

                assert.deepEqual(Array.from(model.mappings()), [ 'image' ]);

                done();
            }).catch(done);
        });

        it('Model.references() Iterating over the models references', function(done) {
            getDB().then((db) => {
                let model = new db.event({
                    title: 'hi'
                });

                assert.deepEqual(Array.from(model.references()), [ 'venue' ]);

                done();
            }).catch(done);
        });

        it('Model.belongTos() Iterating over the models belong tos', function(done) {
            getDB().then((db) => {
                let model = new db.event({
                    title: 'hi'
                });

                assert.deepEqual(Array.from(model.belongTos()), [ 'event_image' ]);

                done();
            }).catch(done);
        });

        it('Model.properties() Iterating over the models properties', function(done) {
            getDB().then((db) => {
                let model = new db.event({
                    title: 'hi'
                });

                assert.deepEqual(Array.from(model.properties()),  [{"key":"id","value":"column"},{"key":"id_venue","value":"column"},{"key":"title","value":"column"},{"key":"get","value":"column"},{"key":"venue","value":"reference"},{"key":"event_image","value":"belongsTo"},{"key":"image","value":"mapping"}]);

                done();
            }).catch(done);
        });





        it('Model.hasColumn() with an existing column', function(done) {
            getDB().then((db) => {
                let model = new db.event();
                
                assert.equal(model.hasColumn('title'), true);

                done();
            }).catch(done);
        });

        it('Model.hasColumn() with an not existing column', function(done) {
            getDB().then((db) => {
                let model = new db.event();
                
                assert.equal(model.hasColumn('so what?'), false);

                done();
            }).catch(done);
        });




        it('x in Model with an existing property', function(done) {
            getDB().then((db) => {
                let model = new db.event();
                
                assert.equal('title' in model, true);

                done();
            }).catch(done);
        });

        it('x in Model with a non existing property', function(done) {
            getDB().then((db) => {
                let model = new db.event();
                
                assert.equal('nope' in model, false);

                done();
            }).catch(done);
        });

        it('x in Model with a public method', function(done) {
            getDB().then((db) => {
                let model = new db.event();
                
                assert.equal('columns' in model, false);

                done();
            }).catch(done);
        });

        it('x in Model with a private method', function(done) {
            getDB().then((db) => {
                let model = new db.event();
                
                assert.equal('createBelongsToSet' in model, false);

                done();
            }).catch(done);
        });





        it('the mapping constructor cache works and is shared between instances', function(done) {
            getDB().then((db) => {
                let model = new db.event();

                assert.equal(model.getUnproxiedModelInstance().mappingConstructors.has('image'), false);                
                model.image.add(new db.image());
                assert.equal(model.getUnproxiedModelInstance().mappingConstructors.has('image'), true);

                let model2 = new db.event();
                assert.equal(model2.getUnproxiedModelInstance().mappingConstructors.has('image'), true);
                model2.image.add(new db.image());

                done();
            }).catch(done);
        });

        it('the belongs to constructor cache works and is shared between instances', function(done) {
            getDB().then((db) => {
                let model = new db.event();

                assert.equal(model.getUnproxiedModelInstance().belongsToConstructors.has('event_image'), false);                
                model.event_image.add(new db.event_image());
                assert.equal(model.getUnproxiedModelInstance().belongsToConstructors.has('event_image'), true);

                let model2 = new db.event();
                assert.equal(model2.getUnproxiedModelInstance().belongsToConstructors.has('event_image'), true);
                model2.event_image.add(new db.event_image());

                done();
            }).catch(done);
        });
    });
})();
