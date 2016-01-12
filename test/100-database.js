(function() {
    'use strict';


    let Class           = require('ee-class');
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
    });
})();
