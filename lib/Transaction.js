!function(){

    var   Class         = require('ee-class')
        , log           = require('ee-log')
        , type          = require('ee-types');





    module.exports = function(database) {
        return Object.create(database, {

            commit: {enumerable: true, value: function(callback){
                if (this._transaction) this._transaction.commit(callback);
                else callback(new Error('Cannot commit! The transaction has already eneded.'));
                this._endTransaction();
            }}


            , rollback: {enumerable: true, value: function(callback){
                if (this._transaction) this._transaction.rollback(callback);
                else callback(new Error('Cannot rollback! The transaction has already eneded.'));   
                this._endTransaction();         
            }}


            , executeQuery: {enumerable: true, value: function(mode, query, callback){
                if (this._transaction) this._transaction.query(mode, query, callback);
                else {
                    this._database.getConnection(false, function(err, connection){
                        if (err) callback(err);
                        else {
                            this._transaction = connection;
                            this._transaction.startTransaction();
                            this._transaction.on('end', this._endTransaction.bind(this));

                            this.executeQuery(mode, query, callback);
                        }
                    }.bind(this));
                }
            }}


            , _endTransaction: {value: function(){
                this._transaction = null;               
            }}

            , _transaction: {value: null, writable:true, configurable: true}
        });
    }
}();
