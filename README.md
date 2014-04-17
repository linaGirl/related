# ee-orm

An easy to use ORM for node.js. This ORM works only with proper designed relational databases. It gets al information needed from the DB itself, you don't have to manually create models. It supports advanced eager loading, complex queries, joins, transactions, complex database clusters & connection pooling.

-- alpha software --, expect a stable release in june 2014.

## installation

install via npm, you may only install the packages required for you rdbms. currently supported are postgres & mysql.

    npm install ee-orm ee-postgres-connection ee-mysql-connection

## Versions

If the api changes the minor version number will change. So if you use the version «0.2.x» you will have always the same stable api. 

## build status

[![Build Status](https://travis-ci.org/eventEmitter/ee-orm.png?branch=master)](https://travis-ci.org/eventEmitter/ee-orm)

## usage


### Example

    var ORM = require('ee-orm');

    // load models from the «eventdata» db
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
    orm.on('load', function(err){
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
                    log(events.first()); // {id:1, title: "prodigy", startdate: "2012-07-08 22:00:00", venues: [{id: 45, name: "via felsenau"}]};

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
                log(events); // [{id:1}, {id:2}]
            });

            orm.eventdata.venues({id: 56}).events(['id']).find(function(err, venues){
                log(venues); // [{id:56, events: [{id:1}, {id:2}]}]
            });
        }
    });



### API

#### Constructor

The consturctor expects the complete configuration used for accessing a database or cluster. The ORM makes always use of a conenction pool which may be configured in the config described below.

    var ORM = require('ee-orm');

    var ormInstance = new ORM(config);

For every Database used by the ORM you have to provide a complete configuration stored on the the key which must be the name of the database. When using the postgres driver the schema has to have the same name as the database itself.
    
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
                }
                , {
                      host              : 'mydbcuster.mycompyny.mytld'
                    , username          : 'eventsUsers'
                    , password          : 'securebeyondanything'
                    , port              : 5432
                    , mode              : 'readonly'
                    , maxConenctions    : 200
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



#### Reserved Keywords

On the ORM itself the following keywords are reserved (your database should not have a name which is listed below):

- $$$$_events
- __proto__
- _initializeDatabases
- _initializeOrm
- _manageAccessorNames
- _setProperty
- addListener
- emit
- getDatabase
- init
- listener
- off
- on
- once
- prototype
- hasOwnProperty
- toString
- toJSON



On the Database level the following keywords are reserved (your database should not contain any tables using one of the names listed below):

- $$$$_events
- __proto__
- _delete
- _getChangedValues
- _getDatabase
- _getFilters
- _getOptions
- _getSelect
- _handleBelongsTo
- _handleMapping
- _handleReference
- _initialize
- _parseFilter
- _parseSelect
- _save
- _saveBelongsTo
- _saveChildren
- _saveMappings
- _saveReferences
- _setChanged
- _setProperty
- _setValues
- addListener
- clone
- createTransaction
- delete
- emit
- executeQuery
- filter
- find
- findOne
- getDefinition
- getEntityName
- hasOwnProperty
- init
- isFromDatabase
- isSaved
- limit
- listener
- loadAll
- off
- offset
- on
- once
- prototype
- reload
- save
- toJSON
- toString



On the Model level the following keywords are reserved (your tables should not contain any columns using on of the names listed below):

- $$$$_events
- __proto__
- _delete
- _getChangedValues
- _getFilters
- _getOptions
- _getSelect
- _handleBelongsTo
- _handleMapping
- _handleReference
- _parseFilter
- _parseSelect
- _save
- _saveBelongsTo
- _saveChildren
- _saveMappings
- _saveReferences
- _setChanged
- _setProperty
- _setValues
- addListener
- clone
- delete
- emit
- filter
- find
- findOne
- getDefinition
- getEntityName
- hasOwnProperty
- init
- isFromDatabase
- isQuery
- isSaved
- limit
- listener
- loadAll
- off
- offset
- on
- once
- prototype
- reload
- save
- toJSON
- toString
