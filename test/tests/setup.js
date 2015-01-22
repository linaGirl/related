!function() {

    var   log       = require('ee-log')
        , assert    = require('assert')
        , ORM       = require('../../');


    module.exports = function(orm, config) {
        describe('Database Setup', function() {
            
            it('Creating the database «related_orm_test»', function(done) {
                orm.createDatabase(config[0], 'related_orm_test').then(function() {
                    done();
                }).catch(done);
            });


            it('Creating the schema «related_orm_test»', function(done) {
                orm.createSchema(config[0], 'related_orm_test').then(function() {
                    done();
                }).catch(done);
            });


            it('Should accept a new config and load the «related_orm_test» schema', function(done) {
                orm.addConfig(config, done);
            });
        });



        describe('Creating Tables', function() {

            it('Creating the event table', function(done) {
                log(orm);
                done();
            });
        });
    };
}();
