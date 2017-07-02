

1. install

```
npm i --save related
```


2. Connect to any existing database
```
const Related = require('related');

const customerDatabase = new Related({
      type      : 'postgres'
    , database  : 'customer'
    , hosts: [{
          host           : '10.1.33.7'
        , username       : 'customer-db-user'
        , password       : 'my-secure-pw'
    }]
});


customerDatabase.load().then(() => {
    // ready to execute queries

}).catch((err) => {
    // oh snap :(
});
```


3. Execute Queries
```
// get a list of customers with emails ending in 
// @joinbox.com, start with record 10, return not 
// more than 100 records and also load the company 
// info for all customers
customerDatabase.customers(['id', 'name', 'email'], {
    email: Related.like('%@joinbox.com')
}).getCompany('*').offset(10).limit(100).order('name').find().then((data) => {
    
    console.log(data);
    //  [{
    //        id: 23
    //      , name: 'Michael van der Weg'
    //      , email: 'michael@joinbox.com'
    //      , id_company: 3
    //      , company: {
    //            id: 56
    //          , name: 'Joinbox Ltd.'
    //          , countryCode: 'ch'
    //      }
    //  }]
}).catch(err => console.log(err));
```