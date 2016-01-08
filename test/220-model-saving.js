(function() {
    'use strict';


    let log             = require('ee-log');
    let assert          = require('assert');
    let type            = require('ee-types');


    let getDB           = require('./lib/getDB');
 


    
    
    describe('Model Saving', function() {

        /*it('simple values using promises', function(done) {
            getDB().then((db) => {

                // 
                db.$cluster.once('query', (queryContext, resolve, reject) => {
                    log(queryContext);
                });


                return new db.event({
                    title: 'myTestEvent'
                }).save().then(() => {

                });
            }).catch(done);
        });*/

    });
})();
