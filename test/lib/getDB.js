(function() {
    'use strict';


    let log             = require('ee-log');
    let type            = require('ee-types');


    let FakeCluster     = require('./FakeCluster');
    let Related         = require('../../');



    // not using a real db for these tests
    let config = {
          schema: 'testDB'
        , hosts:[]
    };
    



    
    module.exports = function() {
        let cluster = new FakeCluster();

        let db = new Related({
            clusterInstance: cluster
        });

        return db.load();
    };
})();
