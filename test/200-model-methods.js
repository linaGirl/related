(function() {
    'use strict';


    let Class           = require('ee-class');
    let log             = require('ee-log');
    let assert          = require('assert');
    let type            = require('ee-types');


    let getDB           = require('./lib/getDB');



    
    
    describe('Model Methods', function() {

       

        it('Instantiating a Model', function(done) {
            getDB().then((db) => {
                new db.event({});
                done();
            }).catch(done);
        });



        it('Model.isNew() I', function(done) {
            getDB().then((db) => {
                let model = new db.event({});

                assert.equal(model.isNew(), true);

                done();
            }).catch(done);
            
        });

        it('Model.isNew() II', function(done) {
            getDB().then((db) => {
                let model = new db.event({}).populateFromDatabase({
                    title: 'testEvent'
                }, ['title']);

                assert.equal(model.isNew(), false);

                done();
            }).catch(done);
            
        });



        it('Model.isDirty() I', function(done) {
            getDB().then((db) => {
                let model = new db.event({});

                assert.equal(model.isDirty(), true);

                done();
            }).catch(done);
        });

        it('Model.isDirty() II', function(done) {
            getDB().then((db) => {
                let model = new db.event({}).populateFromDatabase({
                    title: 'testEvent'
                }, ['title']);

                assert.equal(model.isDirty(), false);

                done();
            }).catch(done);
        });



        it('Model.populateFromDatabase() I', function(done) {
            getDB().then((db) => {
                let model = new db.event({}).populateFromDatabase({
                    title: 'testEvent'
                }, ['title']);

                assert.equal(model.isNew(), false);
                assert.equal(model.title, 'testEvent');
                assert.equal(model.get('title'), 'testEvent');

                done();
            }).catch(done);            
        });

        it('Model.populateFromDatabase() II', function(done) {
            getDB().then((db) => {
                let model = new db.event({}).populateFromDatabase({
                    get: 'getValue'
                }, ['get']);

                assert.equal(model.isNew(), false);
                assert.equal(type(model.get), 'function');
                assert.equal(model.get('get'), 'getValue');

                done();
            }).catch(done);     
        });



        it('Model.get()', function(done) {
            getDB().then((db) => {
                let model = new db.event({}).populateFromDatabase({
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



        it('Model.set()', function(done) {
            getDB().then((db) => {
                let model = new db.event();

                model.set('get', 'getValue');
                model.set('title', 'testEvent');

                assert.equal(type(model.get), 'function');
                assert.equal(model.get('get'), 'getValue');
                assert.equal(model.title, 'testEvent');
                assert.equal(model.get('title'), 'testEvent');

                done();
            }).catch(done);
        });
    });
})();
