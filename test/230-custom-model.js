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


        // 1. that is called when saving the model
        onBeforeSave(parameters) {

        }

        // 2. its called before all queries are
        // executed 
        onBeforePrepare(parameters) {

        }

        // 3. called after all query items have
        // been executed
        onAfterPrepare(parameters) {

        }

        // 4. before the delete method is executed
        onBeforeDelte(parameters) {

        }

        // 4. before the insert method is executed
        onBeforeInsert(parameters) {

        }

        // 4. before the update method is executed
        onBeforeUpdate(parameters) {

        }

        // 5. after the delete method is executed
        onAfterDelete(parameters) {

        }

        // 5. after the insert method is executed
        onAfterInsert(parameters) {

        }

        // 5. after the update method is executed
        onAfterUpdate(parameters) {

        }

        // 6. after the model was saved
        onAfterSave(parameters) {

        }




        // before the transaction is commited, can be called anytime 
        // before the onAfterSave event or anytime thereafter
        onBeforeCommit(parameters) {

        }

        // after the transaction is commited, can be called anytime 
        // before the onAfterSave event or anytime thereafter
        onAfterCommit(parameters) {

        }

        // after the transaction is rolled back, can be called anytime 
        // before the onAfterSave event or anytime thereafter
        onAfterRollback(parameters) {

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
