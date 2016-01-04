# Quick Setup

The Related ORM currently supports Postgres and MySQL databases. It creates models for all 
tables found in the database automatically. It's easy, fast and powerful!



## Installation

First you have to install the dependency using NPM

	npm i related

Related makes use of [semantic versioning]() which means the following:

- A change in the last part of the version (patch) is a bug fix: 3.0.1 -> 3.0.2
- A change in the middle part of the version (minor) is a new added feature: 3.0.1 -> 3.1.0
- A change in the first part of the version (major) indicates that there was a breaking change which is not backwards compatible: 2.5.9 -> 3.0.0

You should aways be on the save side if you depend on th major version number
	
	"dependencies": {
		"related": "3.x"
	}

You can stay up to date using the [changelog](#changelog).







## Connecting to the Database

Please see the [example database entity relationship model](#example-db/erm), all examples in the docs depend on this schema.

Lets now connect to our database
	
	// import
	let RelatedORM = require('related');


	// create an instance of the orm
	let eventDb = new RelatedORM();


	// instruct the orm to conenct to the db
	// and load the models
	eventDb.load({
		  user: 'myDbUser'
		, pass: 'soSecure'
		, host: 'localhost'
		, type: 'postgres'
	}).then(() => {


		// the connection to the db was established, 
		// the models were generated, we're now ready 
		// to start using the db
	});


See the [cluster section](#cluster) if you are working with database clusters, hot standbys or read replicas!







## Querying data

Since related created models for all the entities found in the database by itself 
you can immediatelly start querying data

Lets laod all events which start later as now from the database. Load the id, startDate and title columns.

	eventDb.event(['id, 'startDate', 'title'], {
		startDate: eventDb.f.gt(new Date())
	}).find().then((eventList) => {

		// we just laoded all events starting later than now
		console.dir(eventList);
	})

See the [Querying](#query-builder) section for more details on how to load and filter data.







## Inserting Data

You dont have to write or define the modelsyourself, related created them ont the fly for you. 

Lets create a new event

	new eventDb.event({
		  startDate: new Date()
		, title: 'My big birthday party'
	}).save().than((newEvent) => {

		// the event was successfully stored
		// in the database
		console.dir(newEvent);
	});

See the [Insert](#insert) section for more details on how to insert new data into the database.