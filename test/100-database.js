(function() {
    'use strict';


    let type            = require('ee-types');
    let log             = require('ee-log');
    let assert          = require('assert');


    
    let FakeCluster     = require('./lib/FakeCluster');
    let Related         = require('../');
    let getDB           = require('./lib/getDB');


    // not using a real db for these tests
    let config = {
          schema: 'testDB'
        , hosts:[]
    };

    
    
    describe('Database', function() {
        it('should not crash when instantiated', function() {
            new Related();
        });


        it('should initialize the cluster I', function(done) {
            new Related({
                Cluster: FakeCluster
            }).load(config).then((related) => {
                assert(related && related.event);
                done();
            }).catch(done);
        });



        it('should fail to return a transaction when not initialized', function(done) {
            new Related().createTransaction().then((t) => {
                assert(!t);
                done();
            }).catch((err) => {
                assert(err);
                done();
            });
        });




        it('should return the event entity using the get method', function(done) {
            getDB().then((db) => {
                assert(db.get('event'));

                done();
            }).catch(done);
        });

        it('should not return the fantasy entity using the get method', function(done) {
            getDB().then((db) => {

                assert.throws(() => {
                    db.get('fantasy')
                });

                done();
            }).catch(done);
        });





        it('db.getQueryBuilderContructor() getting the querybuilder constructor', function(done) {
            getDB().then((db) => {

                assert.equal(type(db.getUnproxiedDatabaseInstance().getQueryBuilderContructor('event')), 'function');

                done();
            }).catch(done);
        });

        it('db.getModelContructor() getting the model constructor', function(done) {
            getDB().then((db) => {

                assert.equal(type(db.getUnproxiedDatabaseInstance().getModelContructor('event')), 'function');

                done();
            }).catch(done);
        });

        it('db.getQueryBuilderContructor() getting the querybuilder constructor of an invalid entitiy', function(done) {
            getDB().then((db) => {

                assert.throws(() => {
                    db.getUnproxiedDatabaseInstance().getQueryBuilderContructor('naay');
                });

                done();
            }).catch(done);
        });

        it('db.getModelContructor() getting the model constructor of an invalid entitiy', function(done) {
            getDB().then((db) => {

                assert.throws(() => {
                    db.getUnproxiedDatabaseInstance().getModelContructor('naay');
                });

                done();
            }).catch(done);
        });




        it('x in Database with an existing property', function(done) {
            getDB().then((db) => {

                assert.equal('event' in db, true);

                done();
            }).catch(done);
        });

        it('x in Database with a non existing property', function(done) {
            getDB().then((db) => {
                
                assert.equal('nope' in db, false);

                done();
            }).catch(done);
        });

        it('x in Database with a public method', function(done) {
            getDB().then((db) => {
                
                assert.equal('get' in db, false);

                done();
            }).catch(done);
        });

        it('x in Database with a private method', function(done) {
            getDB().then((db) => {
                
                assert.equal('getCluster' in db, false);

                done();
            }).catch(done);
        });
    });
})();
