(function() {
    'use strict';


    let log             = require('ee-log');
    let assert          = require('assert');
    let type            = require('ee-types');


    let getDB           = require('./lib/getDB');
    let Model           = require('../').Model;
 


    class CustomEvent extends Model {


        constructor(input) {
            super(input);

            this.set('id_venue', 89);
        }
    }

    

    
    
    describe('Custom models', function() {

        it('db.model = Model setting a custom model class', function(done) {
            getDB().then((db) => {
                db.event = CustomEvent;

                let model = new db.event({
                      title: 'so what!'
                    , id_venue: 89
                });

                assert.deepEqual(model, {
                      id_venue: 89
                    , title: "so what!"
                });

                done();
            }).catch(done);
        });

        it('db.model = Model setting an invalid custom model class', function(done) {
            getDB().then((db) => {
                
                assert.throws(() => {
                    db.oops = CustomEvent;
                });

                done();
            }).catch(done);
        });

        it('db.model = Model setting a custom model class after the model was used already', function(done) {
            getDB().then((db) => {

                let orig = new db.event({
                      title: 'so cool!'
                });

                assert.deepEqual(orig, {
                    title: "so cool!"
                });


                db.event = CustomEvent;

                let model = new db.event({
                    title: 'so what!'
                });

                assert.deepEqual(model, {
                      id_venue: 89
                    , title: "so what!"
                });

                done();
            }).catch(done);
        });
    });
})();
