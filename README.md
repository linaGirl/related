# Related ORM

Unopinionated ORM for relational databases.


[![npm](https://img.shields.io/npm/dm/related.svg?style=flat-square)](https://www.npmjs.com/package/related)
[![Travis](https://img.shields.io/travis/eventEmitter/related.svg?style=flat-square)](https://travis-ci.org/eventEmitter/related)
[![node](https://img.shields.io/node/v/related.svg?style=flat-square)](https://nodejs.org/)


On the fly builds an extensive API representing your database and its tables including their relations and columns. No need to write javascript models.


**Features**
- Supports Postgres & MySQL
- Simple loading and filtering of nested entities
- Advanced query builder that rocks
- Transactions
- Table locks
- Bulk operations
- User extendable models (optional)
- Connection pooling
- Extensions for soft-deletes, nested sets, multilingual content, geo distance computation and reference counting
- Complex DB Cluster support (includes read replicas and failover on AWS RDS)
- No conventions for column names etc.
- Commercial support avialable
- And much more


````
var Related = require('related');

// The ORM looks at your database and builds on the fly models. 
// You can start working on your database immediatelly. 
new Related({
      schema        : 'mySchemaName' // optional
    , database      : 'myDatabaseName'
    , type          : 'postgres'     // or mysql
    , hosts: [{
          host      : 'localhost'
        , username  : 'postgres'
        , password  : ''
        , maxConnections: 20
        , pools     : ['master', 'read', 'write']
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