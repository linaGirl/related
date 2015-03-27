# Related ORM

An extensive object relational mapper for node.js.  


[![npm](https://img.shields.io/npm/dm/related.svg?style=flat-square)](https://www.npmjs.com/package/related)
[![Travis](https://img.shields.io/travis/eventEmitter/related.svg?style=flat-square)](https://travis-ci.org/eventEmitter/related)
[![node](https://img.shields.io/node/v/related.svg?style=flat-square)](https://nodejs.org/)


Got a database but not any representation of the models in Javascript? You don't want to write Javascript models for your Database? The related ORM reads the the definition fo your tables & columns from the database itself and builds an extensive API using that information. Using the related ORM you are up an running in seconds, not hours!

See the full [Documentation](#coming-soon).

**Features**
- Supports PostgreSQL and MySQL, both with connection pooling and cluster support
- Works with any relational schema, generates the API from the tables in the schema
- Automatic and manual transactions
- A simple and an advanced query builder
- Subqueries in filters, selects, inserts and updates
- Aggregate functions
- Raw SQL queries
- Unlimited nested loading
- bulk updates and bulk deletes
- User extendable models
- Extensions API
- Extensions for soft-deletes, nested sets and multilingual content
- Migrations API and migration tools
- Works with promises and callbacks



## Examples

An example on a query loading events an multiple subentites, using selects, filters, limits and promises:

````
var ORM = require('related');

// generate the models from the db
new ORM(user, pass, host, db, [schema], ['mysql']).load(function(err, orm) {

    // get 10 events, their images, their tags, their categories, their venues,
    // the venues images, the venues types
    orm.event({id: ORM.lt(2000)}, ['*'])
     .fetchImage(['url'])
     .fetchTag(['name'])
     .fetchCategory(['name'])
     .getVenue(['*'])
     .fetchImage(['url'])
     .fetchVenueType(['name'])
     .limit(10)
     .find()
     .then(function(events) {
        log(events);
    }).catch(function(err) {
        log.error('something went wrong :(');
    });
});
````

## Versions

The ORM has currently a semi pretty stable API, some minor changes will be applied in the near future.
If theAPI changes the minor version number will change. So if you use the version «0.2.x» you will have always the same api.

## usage


### Example

    var ORM = require('related');

    // load models from the «eventdata» db, using adb config object instead of a
    // simple string for conencting to the db
    var orm = new ORM({
        eventdata: {
              type: 'postgres'
            , hosts: [ // you may add as many hosts as you want
                {
                      host      : 'mydbcuster.mycompyny.mytld'
                    , username  : 'eventsUsers'
                    , password  : 'securebeyondanything'
                    , port      : 5432
                    , mode      : 'readwrite'  // readonly or writeonly would be other options
                }
            ]
        }
    });


    // you may not interact with the orm before it was laoded
    orm.load(function(err){
        if (err) console.log('failed to load ORM!', err);
        else {
            // the orm creates dynamically models from your normalized relational database structure
            // lets say the db has an events table. an event can have many venues (mapping, m:n).
            log(orm); // { events: { events: {}, venues: {}}}

            // you may create complex queries using the generated model structure. the orm
            // has scanned all relations and knows whic entity belongs to which, there is also
            // support for many to many reltions using mapping tables.

            // load events with the ids 1-6, get also the venues for the events but select only the
            // id and the name attribute
            orm.eventdata.events({id: ORM.in(1,2,3,4,5,6)}, ['*']).fetchVenues(['id', 'name']).limit(10).find(function(err, events){
                if (err) log(err);
                else {
                    // get first event
                    events.first().dir() // {id:1, title: "prodigy", startdate: "2012-07-08 22:00:00", venues: [{id: 45, name: "via felsenau"}]};

                    // add new venue to the second event. the events list is an array with advanced functions
                    // the relation to the venues table was automatically on the events model.
                    events[2].venues.push(new orm.eventdata.venues({name: 'dachstock'}));
                    events[2].save(function(err){
                        // the venue was inserted to the venue table, the mapping to the event was created
                    });
                }
            });


            // lets say you want to get all events for a specific venue. you have two possiblitie to do this.
            orm.eventdata.events(['id']).fetchVenues({id: 56}).find(function(err, events){
                events.dir(); // [{id:1}, {id:2}]
            });

            orm.eventdata.venues({id: 56}).events(['id']).find(function(err, venues){
                venues.dir(); // [{id:56, events: [{id:1}, {id:2}]}]
            });
        }
    });



### API

#### Constructor

The consturctor expects the complete configuration used for accessing a database or cluster. The ORM makes always use of a conenction pool which may be configured in the config described below.

    var ORM = require('related');

    var ormInstance = new ORM(config);

For every Database used by the ORM you have to provide a complete configuration stored on the the key which must be the name of the database.

    // database names «eventdata» and «shopping». the «eventdata» database
    // is a single mysql server, the «shopping» database consists of a
    // postgres master and a read replica. the orm tries to use the read replica
    // for readonly queries
    {
        eventdata: {
              type: 'mysql'  // postgres or mysql
            , hosts: [
                {
                      host              : 'mydbcuster.mycompyny.mytld'
                    , username          : 'eventsUsers'
                    , password          : 'securebeyondanything'
                    , port              : 3306
                    , mode              : 'readwrite'  // readonly or writeonly would be other options
                    , maxConenctions    : 50 // optional, defaults to 50
                }
            ]
        }
        , shopping: {
              type: 'postgres'
            , hosts: [
                {
                      host              : 'mydbcuster.mycompyny.mytld'
                    , username          : 'eventsUsers'
                    , password          : 'securebeyondanything'
                    , port              : 5432
                    , mode              : 'readwrite'
                    , maxConenctions    : 20
                    , database          : 'myDatabase'  // optional, the name of the database (not the schema) to
                                                        // connect to (defaults to the database name, «shopping» in this case)
                }
                , {
                      host              : 'mydbcuster.mycompyny.mytld'
                    , username          : 'eventsUsers'
                    , password          : 'securebeyondanything'
                    , port              : 5432
                    , mode              : 'readonly'
                    , maxConenctions    : 200
                    , database          : 'myDatabase'  // optional, the name of the database (not the schema) to
                                                        // connect to (defaults to the database name, «shopping» in this case)
                }
            ]
        }
    }

The orm gets the complete structure of every datbase specified in the config. For each database it creates a representation which it stores on itself. The configuration above will result in the object described below. The ORM cannot be used before the «load» event was fired.

    ormInstance.on('load', function(err){
        if (err) log(err);
        else {
            log(ormInstance); // {eventdata: {...}, shopping: {...}}
        }
    });


if you wish we can add support for dynamic adding & removing of database servers.


#### QueryBuilder

The querybuilder has support for complex queries. Currently some queries are not supported (please report an issue if there is missing something you like to use). You have to use the «queryRaw» method if you need to execute such queries.

Lets take the configuration defined above an see what tables the «eventdata» database has. The ORM scans every database for all tables and all relations between them. There are on naming conventions or requirements exept from some reserved keywords (see «reserved keywords»).

    log(ormInstance.eventdata);
    // {
    //       event: {}             // table containing events
    //     , event_image: {}       // mapping to the image table
    //     , event_language: {}    // mapping to the language table (locales)
    //     , event_venue: {}       // mapping tot he venue table, an event can have many venues
    //     , image: {}             // the images table
    //     , language: {}          // the languages
    //     , venue: {}             // th e venues table
    //     , venue_image: {}       // the mapping between venues and images
    //     , venue_locale: {}      // venue locales
    // }

Every entity represented in the object above is a querybuilder and has the same set of methods on it:

- delete: execute the built query, delete the result set (DELETE FROM ...)
- filter: apply a subfilter for nested data loading, see below)
- find: execute the query(SELECT x, y, z FROM ...)
- findOne: same as the find method, but limit the result to one result
- limit: limit your query
- offset: add an offset to your query
- update: execute your query, update the result set (UPDATE set x=Y, ... WHERE ... )


Every querybuilder has methods linking to all referenced tables. These methods are built using the referenced tables name and the keyword «get» and «fetch». The «get» and «fetch» method do the exact same thing, they differ only in the scope returned. The «event» querybuilder for example has the the following methods added because of its relations to other tables:

- getImage
- fetchImage
- getLanague
- fetchLanguage
- getVenue
- fetchVenue


if you don't know which methods are available on an entity you can use the «describeMethods» method for listing them.

    ormInstance.eventdata.event().describeMethods();
    // { getImage: 'Mapping accessor for the «image» Model', .... }

So, what exactly are those generated methods useful for? They let you build complex queries with ease. They make it also possible to fetch unlimited nested data from the database (it will get slower with each additional level you're fetching).

Each of the method accepts the following arguments (of whic all are optional) in any order.

- Object: a filter statement
- Array: a select statement

Lets fetch some events:

    // select all events in the table, returns only their id (the primary key is selected automatically)
    ormInstance.eventdata.event().find(function(err, events){

    });

    // select all events, return all columns
    ormInstance.eventdata.event([*]).find(function(err, events){

    });

    // select all events, return the id and the title columns
    ormInstance.eventdata.event(['id', 'title']).find(function(err, events){

    });

Lets select & filter some events:

    // fecth the event with the id 9, select the id only
    ormInstance.eventdata.event({id: 9}).find(function(err, events){

    });

    // fecth the event with the id 7,8,9, select the id and title
    ormInstance.eventdata.event({id: ORM.in([7, 8, 9])}, ['id', 'title']).find(function(err, events){

    });

Lets select all events of the venue with the id 56, select the events title and id

    ormInstance.eventdata.event(['id', 'title']).fetchVenue({id:56}).find(function(err, events){

    });

    // the exact same query as above (get vs fetch)
    ormInstance.eventdata.event(['id', 'title']).getVenue({id:56}).find(function(err, events){

    });

Lets select all events of the venue with the id 56, select the events title and id and all columns of the venue

    ormInstance.eventdata.event(['id', 'title']).getVenue(['*'], {id:56}).find(function(err, events){

    });

Now lets also get the images of the venue (get vs fetch)

    // loads all events of the venue with the id 56 and all images attched to the venue
    //the getVenue did change the scope to the venue entity, so the fetchImage points to
    // the images of the ***venue***
    ormInstance.eventdata.event(['id', 'title']).getVenue(['*'], {id:56}).fetchImage(['*']).find(function(err, events){

    });

    // fetchVenue vs getVenue: because we used fetchVenue instead of getVenue the scope
    // stays on the previuos item which is in this case the the «event» entity. this query
    // fetches all events of the venue with the id 56 and all images attched to the ***event***
    ormInstance.eventdata.event(['id', 'title']).fetchVenue(['*'], {id:56}).fetchImage(['*']).find(function(err, events){

    });

Now lets do a complex query:

    // get all columns of the event table, dont filter yet
    var myQuery = ormInstance.eventdata.event(['*']);

    // filter events by the venue with the id 56, select all columns of the venue
    // table, get the description locale from the locale table where the language
    // is english.
    // the filter method is called on the language entity because we want all the
    // events and not only those with english locales (join vs. left join) but we
    // want only the english locales. filter events by locale vs. filter locales
    myQuery.getVenue({id:56}, ['*']).fetchImage(['*']).getVenue_language(['description']).getLanguage().filter({code: 'en'});


    // get all event images, get the english event locale
    myQuery.fetchImage(['*']).getEvent_language(['description']).fetchLanguage({code: 'en'});

    // execute the query
    myQuery.find(function(err, events){
        log(events);
        // [
        //     {
        //           id: 34
        //         , title: 'bookashade'
        //         , event_language: [
        //             {
        //                   id_event: 32
        //                 , id_language: 1
        //                 , description: 'lorem ipsum ...'
        //             }
        //         ]
        //         , image: [
        //             {
        //                   id: 34
        //                 , url: 'http://eventemitter.com/...'
        //             }
        //             , {
        //                   id: 35
        //                 , url: 'http://eventemitter.com/...'
        //             }
        //         ]
        //         , venue: [
        //             {
        //                   id: 56
        //                 , name: 'Lavo'
        //                 , venue_language: [
        //                     {
        //                           id_venue: 56
        //                         , id_language: 1
        //                         , description: 'lorem ipsum ...'
        //                     }
        //                 ]
        //                 , image: [
        //                     {
        //                           id: 456
        //                         , url: 'http://eventemitter.com/...'
        //                     }
        //                     , {
        //                           id: 978
        //                         , url: 'http://eventemitter.com/...'
        //                     }
        //                 ]
        //             }
        //         ]
        //     }
        // ]
    });


##### Advanced Filtering

The filter object which can be used by the queryuilder and the filter mehotd can contain the following structure

- tbd

##### Advanced Query Builder

    var   query = db.event(['*'])
        , qb    = query.queryBuilder();


    qb.and({
          id: ORM.gt(0)
        }
        , qb.or({
                  'venue.name': ORM.like('re%')
                , 'venue.id_image': 5
            }
            , qb.and({
                  'venue.municipality.county.country.code': 'ch'
                , 'venue.municipality.county.code': 'be'
            })
        )
    );


    query.find(log);



##### Model Events

All events receive the following parameters (except those which contain the word «commit»)
- modelInstance: the model which emitted the event (this is passed to all models)
- transaction: the transaction the current process is working on
- callback: which must be called so the model can continue doing its actions. is the first parameter is set (err) then the model aborts the ucrrent process and rolls back the transaction. if the second parameter is set to true the model stops the curernt process and commits all changes.

Eventlist

- beforeSave: emitted before saving the model and all its references & mappings
- afterSave: emitted when the model and all its references & mappings were saved, but the transaction was not yet commited
- afterSaveCommit: emitted when the model and all its references & mappings were saved and the changes were commited

- beforeUpdate: emitted before an upate
- afterUpdate: emitted after the update without the transaction commited
- afterUpdateCommit: emitted after the update with the changes were commited

- beforeInsert: emitted before an insert
- afterInsert: emitted after the insert without the transaction commited
- afterInsertCommit: emitted after the insert with the changes were commited

the delete event gets as last parameter a flag which indicates if the record was / is goint to be deleted using a softdelete
- beforeDelete: emitted before a delete
- afterDeleteCommit: emitted after the delete was commited

- beforeSaveReference: emitted before the referrences of the current model are saved
- aftereSaveReferences: emitted after the references of the current model were saved, before the changes are commited

- beforeSaveMappings: emitted before the mappings of the current model are saved
- aftereSaveMappings: emitted after the mappings of the current model were saved, before the changes are commited

- beforeSaveBelongsTo: emitted before the belonging models of the current model are saved
- aftereSaveBelongsTo: emitted after the belonging models of the current model were saved, before the changes are commited


##### QueryBuilder inner workings

1. Collect all joins, filters for the query, apply them
2. Collect all subqueries (eager loading) if it or any child is selected
3. Join its parent resource, all resources down to the root resource
4. filter with the «in» statement
5. Enjoy
