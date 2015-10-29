# Related ORM

ORM for relational databases. Eager loading, connection pooling, automatic failover, clusters, transactions, complex queries. Database first. No conventions.


[![npm](https://img.shields.io/npm/dm/related.svg?style=flat-square)](https://www.npmjs.com/package/related)
[![Travis](https://img.shields.io/travis/eventEmitter/related.svg?style=flat-square)](https://travis-ci.org/eventEmitter/related)
[![node](https://img.shields.io/node/v/related.svg?style=flat-square)](https://nodejs.org/)


Got a database but not any representation of the models in Javascript? You don't want to write Javascript models for your Database? The related ORM reads the the definition fo your tables & columns from the database itself and builds an extensive API using that information. Using the related ORM you are up an running in seconds, not hours!


**Features**
- Support for Postgres & MySQL, both with connection pooling and clusters
- Works with any relational schema, generates the API from the table definitions loaded from the database
- Automatic and manual transactions
- A simple and an advanced query builder for complex queries
- Subqueries in filters, selects, inserts and updates
- Aggregate functions
- Raw SQL queries
- Unlimited nested loading
- Bulk updates and bulk deletes
- User extendable models
- Extensions API
- Extensions for soft-deletes, nested sets, multilingual content, geo distance computation and reference counting
- Works with promises and callbacks
- ES6


````
var Related = require('related');

// The ORM looks at your database and builds on the fly models. 
// You can start working on your database immediatelly. 
new Related({
      schema        : 'mySchemaName' // optional for mysql
    , database      : 'myDatabaseName'
    , type          : 'postgres'     // or mysql
    , hosts: [{
          host      : 'localhost'
        , username  : 'postgres'
        , password  : ''
        , port      : 5432
        , mode      : 'readwrite'
        , maxConnections: 20
        , id        : 'master'
    }]    
}).load().then(function(orm) {


    // get 10 events, their images, their tags, their categories, their venues,
    // the venues images, the venues types. the 'get' prefix change sscope to the other model
    // the 'fetch' prefix doenst change the scope and you can continue working on the current
    // model
    orm.event({id: Related.lt(2000)}, ['*'])
        .fetchImage(['url'])
        .fetchTag(['name'])
        .fetchCategory(['name'])
        .getVenue(['*'])
        .fetchImage(['url'])
        .fetchVenueType(['name'])
        .limit(10)
        .find().then(function(events) {

        log(events);
    }).catch(function(err) {

        log('something went wrong :(');
    });
});
````


## API

We are currently working on an extensive documentation and a website. Until those are online please look at the [tests](https://github.com/eventEmitter/related/blob/master/test/orm.js) 


### Extensions

- ***[Timestamps](https://www.npmjs.com/package/related-timestamps):*** support for automatic timestamps and soft deletes 
- ***[GEO](https://www.npmjs.com/package/related-geo):*** Area and distance searches using longitutde and latitude
- ***[Localization](https://www.npmjs.com/package/related-localization):*** support for multilanguage content in the relational model
- ***[Nested Sets](https://www.npmjs.com/package/related-nested-set):*** support for [nested sets](https://en.wikipedia.org/wiki/Nested_set_model) 
- ***[Reference Counting](https://www.npmjs.com/package/related-reference-counter):*** Counts items that are referenced by the current entity