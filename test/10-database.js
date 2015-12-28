(function() {
    'use strict';


    let Class           = require('ee-class');
    let log             = require('ee-log');
    let assert          = require('assert');


    
    let FakeCluster     = require('./FakeCluster');
    let Related         = require('../');


    // not using a real db for these tests
    let config = {
          schema: 'testDB'
        , hosts:[]
    };

    
    
    describe('Database', function() {
        it('should not crash when instantiated', function() {
            new Related();
        });


        it('should initialize the cluster', function(done) {
            new Related({
                Cluster: FakeCluster
            }).load(config).then((related) => {
                assert(related && related.event);
                done();
            }).catch(done);
        });
    });
})();
