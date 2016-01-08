(function() {
    'use strict';


    let Class     = require('ee-class');
    let log       = require('ee-log');

    

    // sadly we'll have to simulate a db using these :/
    let DatabaseDefinition      = require('related-db-analyzer').Database;
    let EntityDefinition        = require('related-db-analyzer').Entity;
    let ColumnDefinition        = require('related-db-analyzer').Column;
    let ReferenceDefinition     = require('related-db-analyzer').Reference;
    let MappingDefinition       = require('related-db-analyzer').Mapping;
    let BelongsToDefinition     = require('related-db-analyzer').BelongsTo;






    
    






    module.exports = new Class({


        describe: function() {
            let databases = new Map();

            databases.set('testDB', this.getDatabase());

            return Promise.resolve(databases);
        }





        , getDatabase: function() {
            let db = new DatabaseDefinition({
                  name: 'testDB'
                , exists: true
            });


            // add fake entities
            db.setEntity('image', this.getImageEntitiy(db));
            db.setEntity('venue', this.getVenueEntitiy(db));
            db.setEntity('venue_image', this.getVenueImageEntitiy(db));
            db.setEntity('event', this.getEventEntitiy(db));
            db.setEntity('event_image', this.getEventImageEntitiy(db));


            return db;
        }








        , getEventEntitiy: function(db) {
            let entity = new EntityDefinition({
                name: 'event'
            }, db);

            entity.setColumn('id', new ColumnDefinition({
                  name          : 'id'
                , type          : 'serial'
                , jsTypeMapping : 'number'
                , nullable      : false
                , nativeType    : 'serial32'
                , isPrimary     : true
            }, entity));


            entity.setColumn('id_venue', new ColumnDefinition({
                  name          : 'id_venue'
                , type          : 'int'
                , jsTypeMapping : 'number'
                , nullable      : false
                , nativeType    : 'int32'
                , isForeignKey  : true
            }, entity));


            entity.setColumn('title', new ColumnDefinition({
                  name          : 'title'
                , type          : 'varchar'
                , jsTypeMapping : 'string'
                , nullable      : false
                , nativeType    : 'varchar'
            }, entity));


            entity.setColumn('get', new ColumnDefinition({
                  name          : 'get'
                , type          : 'varchar'
                , jsTypeMapping : 'string'
                , nullable      : false
                , nativeType    : 'varchar'
            }, entity));



            entity.getColumn('id_venue').setReference(new ReferenceDefinition({
                  referencedColumn  : db.getEntity('venue').getColumn('id')
                , onUpdate          : 'cascade'
                , onDelete          : 'restrict'
            }, entity.getColumn('id_venue')));


            db.getEntity('venue').getColumn('id').addReferencedColumn(new BelongsToDefinition({
                  referencedByColumn: entity.getColumn('id_venue')
                , onUpdate          : 'cascade'
                , onDelete          : 'restrict'
            }, db.getEntity('venue').getColumn('id')));

            return entity;
        }









        , getVenueEntitiy: function(db) {
            let entity = new EntityDefinition({
                name: 'venue'
            }, db);

            entity.setColumn('id', new ColumnDefinition({
                  name          : 'id'
                , type          : 'serial'
                , jsTypeMapping : 'number'
                , nullable      : false
                , nativeType    : 'serial32'
                , isPrimary     : true
            }, entity));


            entity.setColumn('id_image', new ColumnDefinition({
                  name          : 'id_image'
                , type          : 'int'
                , jsTypeMapping : 'number'
                , nullable      : false
                , nativeType    : 'int32'
                , isForeignKey  : true
            }, entity));


            entity.setColumn('name', new ColumnDefinition({
                  name          : 'name'
                , type          : 'varchar'
                , jsTypeMapping : 'string'
                , nullable      : false
                , nativeType    : 'varchar'
            }, entity));




            entity.getColumn('id_image').setReference(new ReferenceDefinition({
                  referencedColumn  : db.getEntity('image').getColumn('id')
                , onUpdate          : 'cascade'
                , onDelete          : 'restrict'
            }, entity.getColumn('id_image')));

            db.getEntity('image').getColumn('id').addReferencedColumn(new BelongsToDefinition({
                  referencedByColumn: entity.getColumn('id_image')
                , onUpdate          : 'cascade'
                , onDelete          : 'restrict'
            }, db.getEntity('image').getColumn('id')));

            return entity;
        }









        , getImageEntitiy: function(db) {
            let entity = new EntityDefinition({
                name: 'image'
            }, db);

            entity.setColumn('id', new ColumnDefinition({
                  name          : 'id'
                , type          : 'serial'
                , jsTypeMapping : 'number'
                , nullable      : false
                , nativeType    : 'serial32'
                , isPrimary     : true
            }, entity));


            entity.setColumn('url', new ColumnDefinition({
                  name          : 'url'
                , type          : 'varchar'
                , jsTypeMapping : 'string'
                , nullable      : false
                , nativeType    : 'varchar'
            }, entity));


            return entity;
        }








        , getVenueImageEntitiy: function(db) {
            let entity = new EntityDefinition({
                name: 'venue_image'
            }, db);


            entity.setColumn('id_venue', new ColumnDefinition({
                  name          : 'id_venue'
                , type          : 'int'
                , jsTypeMapping : 'number'
                , nullable      : false
                , nativeType    : 'int32'
                , isPrimary     : true
                , isForeignKey  : true
            }, entity));


            entity.setColumn('id_image', new ColumnDefinition({
                  name          : 'id_image'
                , type          : 'int'
                , jsTypeMapping : 'number'
                , nullable      : false
                , nativeType    : 'int32'
                , isPrimary     : true
                , isForeignKey  : true
            }, entity));


            

            entity.getColumn('id_image').setReference(new ReferenceDefinition({
                  referencedColumn  : db.getEntity('image').getColumn('id')
                , onUpdate          : 'cascade'
                , onDelete          : 'restrict'
            }, entity.getColumn('id_image')));
            

            entity.getColumn('id_venue').setReference(new ReferenceDefinition({
                  referencedColumn  : db.getEntity('venue').getColumn('id')
                , onUpdate          : 'cascade'
                , onDelete          : 'restrict'
            }, entity.getColumn('id_venue')));


            db.getEntity('venue').getColumn('id').addReferencedColumn(new BelongsToDefinition({
                  referencedByColumn: entity.getColumn('id_venue')
                , onUpdate          : 'cascade'
                , onDelete          : 'restrict'
            }, db.getEntity('venue').getColumn('id')));


            db.getEntity('image').getColumn('id').addReferencedColumn(new BelongsToDefinition({
                  referencedByColumn: entity.getColumn('id_image')
                , onUpdate          : 'cascade'
                , onDelete          : 'restrict'
            }, db.getEntity('image').getColumn('id')));



            entity.defineMapping(['id_venue', 'id_image']);


            db.getEntity('venue').getColumn('id').addMapping(new MappingDefinition({
                  mapping: entity
                , mappedColumn: db.getEntity('image').getColumn('id')
            }, db.getEntity('venue').getColumn('id')));

            db.getEntity('image').getColumn('id').addMapping(new MappingDefinition({
                  mapping: entity
                , mappedColumn: db.getEntity('venue').getColumn('id')
            }, db.getEntity('image').getColumn('id')));


            return entity;
        }





        , getEventImageEntitiy: function(db) {
            let entity = new EntityDefinition({
                name: 'event_image'
            }, db);


            entity.setColumn('id_event', new ColumnDefinition({
                  name          : 'id_event'
                , type          : 'int'
                , jsTypeMapping : 'number'
                , nullable      : false
                , nativeType    : 'int32'
                , isPrimary     : true
                , isForeignKey  : true
            }, entity));


            entity.setColumn('id_image', new ColumnDefinition({
                  name          : 'id_image'
                , type          : 'int'
                , jsTypeMapping : 'number'
                , nullable      : false
                , nativeType    : 'int32'
                , isPrimary     : true
                , isForeignKey  : true
            }, entity));


            

            entity.getColumn('id_image').setReference(new ReferenceDefinition({
                  referencedColumn  : db.getEntity('image').getColumn('id')
                , onUpdate          : 'cascade'
                , onDelete          : 'restrict'
            }, entity.getColumn('id_image')));
            

            entity.getColumn('id_event').setReference(new ReferenceDefinition({
                  referencedColumn  : db.getEntity('event').getColumn('id')
                , onUpdate          : 'cascade'
                , onDelete          : 'restrict'
            }, entity.getColumn('id_event')));


            db.getEntity('event').getColumn('id').addReferencedColumn(new BelongsToDefinition({
                  referencedByColumn: entity.getColumn('id_event')
                , onUpdate          : 'cascade'
                , onDelete          : 'restrict'
            }, db.getEntity('event').getColumn('id')));


            db.getEntity('image').getColumn('id').addReferencedColumn(new BelongsToDefinition({
                  referencedByColumn: entity.getColumn('id_image')
                , onUpdate          : 'cascade'
                , onDelete          : 'restrict'
            }, db.getEntity('image').getColumn('id')));



            entity.defineMapping(['id_event', 'id_image']);


            db.getEntity('event').getColumn('id').addMapping(new MappingDefinition({
                  mapping: entity
                , mappedColumn: db.getEntity('image').getColumn('id')
            }, db.getEntity('event').getColumn('id')));

            db.getEntity('image').getColumn('id').addMapping(new MappingDefinition({
                  mapping: entity
                , mappedColumn: db.getEntity('event').getColumn('id')
            }, db.getEntity('image').getColumn('id')));


            return entity;
        }
    });
})();
