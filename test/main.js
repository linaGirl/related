!function() {
    return;
    var   Class         = require('ee-class')
        , log           = require('ee-log')
        , assert        = require('assert')
        , async         = require('ee-async')
        , fs            = require('fs')
        , Config        = require('test-config')
        , ORM           = require('../');


    var expect = function(val, cb){
        return function(err, result){
            try {
                assert.equal(JSON.stringify(result), val);
            } catch (err) {
                return cb(err);
            }
            cb();
        }
    };



    ['postgres', 'mysql'].forEach(function(dbType) {
        var   config
            , orm;



        config = new Config('config-test.js', {db:[{
              schema        : 'related_orm_test'
            , database      : 'related_orm_test'
            , type          : 'postgres'
            , hosts: [{
                  host      : 'localhost'
                , username  : 'postgres'
                , password  : ''
                , port      : 5432
                , mode      : 'readwrite'
                , maxConnections: 50
            }]
        }, {
              schema        : 'related_orm_test'
            , type          : 'mysql'
            , hosts: [{
                  host      : 'localhost'
                , username  : 'root'
                , password  : ''
                , port      : 3306
                , mode      : 'readwrite'
                , maxConnections: 20
            }]
        }]}).db.filter(function(config) {return config.type === dbType});

        // need a global orm instancd that can be used by all tests
        orm = new ORM();


        describe(dbType.toUpperCase(), function() {
            //require('./tests/cleanUp')(orm, config);
            require('./tests/setup')(orm, config);


            require('./tests/cleanUp')(orm, config);
        });       
    });
}();
