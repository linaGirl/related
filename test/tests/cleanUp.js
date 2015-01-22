!function() {

    var   log       = require('ee-log')
        , assert    = require('assert')
        , ORM       = require('../../');


    module.exports = function(orm, config) {
        describe('Cleanup', function() {
            it('Closing all conenctions on the orm and destructing the api', function(done) {
                this.timeout(10000);
                orm.end(done);
            });


            it('Dropping the schema «related_orm_test»', function(done) {
                orm.dropSchema(config[0], 'related_orm_test').then(function() {
                    done();
                }).catch(done);
            });


            it('Dropping the database «related_orm_test»', function(done) {
                orm.dropDatabase(config[0], 'related_orm_test').then(function() {
                    done();
                }).catch(done);
            });
        });
    };
}();
