!function() {
    'use strict';

    var   Class         = require('ee-class')
        , log           = require('ee-log')
        , asyncMethod   = require('async-method')
        , type          = require('ee-types');



    module.exports = new Class({



        /**
         * classs constructor
         * 
         * @param <Object> model instance to be cloned
         */
        init: function(sourceModelInstance) {

            // source of all required info for this class
            this.sourceModelInstance = sourceModelInstance;

            // config storage
            this._copy = {};
            this._reassign = {};
        }




        /**
         * copy the entites definedd here when cloning
         *
         * @param <Mixed> string entity (0-n) or array of strings
         *
         * @returns <Object> this
         */
        , copy: function() {
            for (var i = 0, l = arguments.length; i < l; i++) {
                if (type.array(arguments[i])) this.copy.apply(this, arguments[i]);
                else if (type.string(arguments[i])) this._copy[arguments[i]] = true;
                else throw new Error('Expected array or string as argument to the copy method!');
            }

            return this;
        }





        /**
         * reassign entites pointing to the entity to be cloned
         * to the cloned copy 
         *
         * @param <Mixed> string entity (0-n) or array of strings
         *
         * @returns <Object> this
         */
        , reassign: function() {
            for (var i = 0, l = arguments.length; i < l; i++) {
                if (type.array(arguments[i])) this.reassign.apply(this, arguments[i]);
                else if (type.string(arguments[i])) this._reassign[arguments[i]] = true;
                else throw new Error('Expected array or string as argument to the reassign method!');
            }

            return this;
        }




        /**
         * e3xecute the cloning
         */
        , save: asyncMethod(function() {
            var   isNewTransaction = false
                , callback
                , transaction
                , definition
                , query
                , err
                , filter;

            for (var i = 0, l = arguments.length; i < l; i++) {
                if (typeof arguments[i] === 'function') callback = arguments[i];
                else if (typeof arguments[i] === 'Object') transaction = arguments[i];
                else throw new Error('The save method expets a callback and or a transaction!');
            }


            if (this.sourceModelInstance.isDirty()) callback(new Error('Cannot clone a dirty model! Please save your model before cloning it!'));
            else if (!this.sourceModelInstance.isFromDatabase()) callback(new Error('Cannot clone a model that was not saved before! Please save your model before cloning it!'));
            else {
                // we're good, check if we got instruction for each and every relation of the 
                // source model
                definition = this.sourceModelInstance.getDefinition();

                // need a proper transaction
                if (!transaction) {
                    if (this.sourceModelInstance._getDatabase().isTransaction()) transaction = this.sourceModelInstance._getDatabase();
                    else {
                        transaction = this.sourceModelInstance._getDatabase().createTransaction()
                        isNewTransaction = true;
                    }
                }

                // filter by pks 
                filter = {};

                // hopefully this works =)
                definition.primaryKeys.forEach(function(keyName) {
                    filter[keyName] = this.sourceModelInstance[keyName];
                }.bind(this));


                // create a querybuilder in order to laod the entites
                query = transaction[definition.name]('*', filter);

                // belongs to items
                Object.keys(definition.belongsTo).some(function(name) {
                    if (this._copy[name]) {
                        // duplicate this record, thus load it
                        query.get(name, '*');

                        // we need to know our fk
                        this._copy[name] = definition.belongsTo[name].targetColumn;
                    }
                    else if (this._reassign[name]) {
                        // load this too, we need to update it
                        query.get(name, '*');

                        // we need to know our fk
                        this._reassign[name] = definition.belongsTo[name].targetColumn;
                    }
                }.bind(this));


                // everything ok, proceed and load the stuff
                if (err) callback(err);
                else {
                    query.findOne().then(function(entity) {
                        if (!entity) callback(new Error('Failed to load the model to clone from the databse, cannot clone it!'));
                        else {
                            // we're ok
                            

                            // delete pks, set 
                            entity.isNotFromDatabase();

                            definition.primaryKeys.forEach(function(keyName) {
                                entity.removeValue(keyName);
                            }.bind(this));


                            // delete our fk on to be copied models
                            Object.keys(this._copy).forEach(function(relationName) {
                                entity[relationName].forEach(function(relatedEntity) {
                                    relatedEntity.isNotFromDatabase();

                                    // delete our fk
                                    relatedEntity.removeValue(this._copy[relationName]);

                                    // check if the pk includes our fk, if not, remove it
                                    if (!relatedEntity.getDefinition().primaryKeys.some(function(keyName) {
                                        return this._copy[relationName] === keyName;
                                    }.bind(this))) {
                                        // delete pks
                                        relatedEntity.getDefinition().primaryKeys.forEach(relatedEntity.removeValue.bind(relatedEntity));
                                    }
                                }.bind(this));
                            }.bind(this));


                            // change reference on the models that need to be reassigned
                            Object.keys(this._reassign).forEach(function(relationName) {
                                entity[relationName].forEach(function(relatedEntity) {
                                    // delete our fk
                                    entity.removeValue(this._reassign[relationName]);
                                }.bind(this));
                            }.bind(this));

                            // save everything
                            entity.save(transaction, function(err, clonedEntity) {
                                if (err) callback(err);
                                else {
                                    if (isNewTransaction) {
                                        transaction.commit(function(err) {
                                            if (err) callback(err);
                                            else callback(null, clonedEntity);
                                        }.bind(this));
                                    }
                                    else callback(null, clonedEntity);
                                }
                            }.bind(this));
                        }
                    }.bind(this)).catch(function(err) {
                        if (isNewTransaction) {
                            transaction.rollback(function() {
                                callback(err);
                            }.bind(this));
                        }
                        else callback(err);
                    }.bind(this));
                }
            }
        })
    });
}();