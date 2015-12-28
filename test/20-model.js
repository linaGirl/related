(function() {
    'use strict';


    let Class           = require('ee-class');
    let log             = require('ee-log');
    let assert          = require('assert');
    let type            = require('ee-types');


    let FakeCluster     = require('./FakeCluster');
    let Related         = require('../');


    // not using a real db for these tests
    let config = {
          schema: 'testDB'
        , hosts:[]
    };



    // we're using only one db instance
    let db;

    
    
    describe('Model Methods', function() {

        before('initialize the cluster', function(done) {
            db = new Related({
                Cluster: FakeCluster
            });

            db.load(config).then(() => {
                done();
            }).catch(done);
        });
        


        it('Instantiating a Model', function() {
            new db.event({});
        });



        it('Model.isNew() I', function() {
            let model = new db.event({});

            assert.equal(model.isNew(), true);
        });

        it('Model.isNew() II', function() {
            let model = new db.event({}).populateFromDatabase({
                title: 'testEvent'
            }, ['title']);

            assert.equal(model.isNew(), false);
        });



        it('Model.isDirty() I', function() {
            let model = new db.event({});

            assert.equal(model.isDirty(), true);
        });

        it('Model.isDirty() II', function() {
            let model = new db.event({}).populateFromDatabase({
                title: 'testEvent'
            }, ['title']);

            assert.equal(model.isDirty(), false);
        });



        it('Model.populateFromDatabase() I', function() {
            let model = new db.event({}).populateFromDatabase({
                title: 'testEvent'
            }, ['title']);

            assert.equal(model.isNew(), false);
            assert.equal(model.title, 'testEvent');
            assert.equal(model.get('title'), 'testEvent');
        });

        it('Model.populateFromDatabase() II', function() {
            let model = new db.event({}).populateFromDatabase({
                get: 'getValue'
            }, ['get']);

            assert.equal(model.isNew(), false);
            assert.equal(type(model.get), 'function');
            assert.equal(model.get('get'), 'getValue');
        });



        it('Model.get()', function() {
            let model = new db.event({}).populateFromDatabase({
                  get: 'getValue'
                , title: 'testEvent'
            }, ['get']);

            assert.equal(type(model.get), 'function');
            assert.equal(model.get('get'), 'getValue');
            assert.equal(model.title, 'testEvent');
            assert.equal(model.get('title'), 'testEvent');
        });



        it('Model.set()', function() {
            let model = new db.event();

            model.set('get', 'getValue');
            model.set('title', 'testEvent');

            assert.equal(type(model.get), 'function');
            assert.equal(model.get('get'), 'getValue');
            assert.equal(model.title, 'testEvent');
            assert.equal(model.get('title'), 'testEvent');
        });
    });
})();
