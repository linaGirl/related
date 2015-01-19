!function() {

    var   log       = require('ee-log')
        , assert    = require('assert')
        , ORM       = require('../../');


    module.exports = function(orm, config) {
        describe('Setup', function() {
            
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
        });
    };
}();
