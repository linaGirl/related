#ee-mysql-orm

*WARNING* this is currently not working!

mysql object relationale mapper for node.js. reads the model directly from the database.


# API

	var MySQLORM = require( "ee-mysql-orm" );

	// the ORM will make us of the «ee-mysql-cluster» module. see «https://github.com/eventEmitter/ee-mysql-cluster» for the hosts options
	var db = new MySQLORM( {
		hosts: [
			{
				  host: 			"myhost.tld"
				, writable: 		true 				// does this host accept writing queries?
				, user:				"masterOfDesaster"
				, pass: 			"0xdeadbeef"
				, maxConnections: 	100
			}
		]
	} );


	// the load event is fired when a connection could be established or when no connection
	// could be etablished. in the latter case an error object will be passed as paremter 1
	// this event is only called on initial load
	db.on( "load", function( err ){ console.log( "db loaded" ) } );

	// is fired when the db works in read only mode ( connected to slaves but not to the master )
	// this event is called always when the connection to the master is dropped or it cannot be 
	// established at startup
	db.on( "readOnly", function( err ){ console.log( "db loaded in read only mode" ) } );

	// is fired when no connection can be established
	// this event is fired always when no connection can be established
	db.on( "error", function( err ){ console.log( "" ) } );



The ORM will load the structure of all databases, tables and the relations between them. The ORM will update its structure every second to make sure it is in sync with the database. You may also provide fixes via code for wrongly interpreted data structures.


	// after the load event is fired the orm is ready and all properties should be set.


	// add a new user to the «user» table of the «events» db
	var michael = new db.events.user( { name: "michael" } ).save( function( err ){} );

	// add address, we need to get the city id for the address
	michael.addAddress( { firstname: "Michael", lastname: "van der Weg", street. "Aarbergergasse", no: 41, city: db.events.city( [ "id" ] ).getCityLocale( { name: "bern", language: this.db.language( { iso2: request.language }, [ id ] ) } ) }, function( err ){

	} );

	// retreive a user with the id «4» from the «events» database
	db.events.user( 4, function( err, user ){} );


retreive a user with the id «4» from the «events» database including his private address data. Users can have multiple address sets which are stored in the «address» table, that table references a table «city», which references the table «municipality», which references the table «district», which references the table «county», which references the table «country». The user has stored his prefererd language on his profile and the «city», «district», «county» and «country» tables have data in all languages stored on separate tables. The statement below will create one query for the complete transaction, so it should be fast!. It will create joins for the 12 tables which will be used in this query. the tables containing the language data are joined using a left join, so there will be a result even without data available for this query.

the fetch and get methods have the same effect, but the get method will return a reference to the object adressed by the get method. the fetch method will remain on the source object.

	db.events.user( { username: "eventEmitter" } )
				  .getAddresses( { type: "private" }, [ "lastname", "firstname", "company companyName", "street", "no" ] )
				  .getCity( [ "zip", "city" ] )
				  .tryFetchCityLocale( { language_id: "user.language_id" } )
				  .getMunicipality()
				  .getDistrict()
				  .getCounty()
				  .getCountry( [ "country", "iso2 countryCode" ] )
				  .tryFetchCountryLocale( { language_id: "user.language_id" }, function( err, data ){
		//  if the user has two private addresses this will return the following object
		{
			  id: 		4
			, username: "eventEmitter"
			, ...
			, addresses: [
				{
					  lastname: 		"van der Weg"
					, firstname: 		"Michael"
					, companyName: 		"joinbox"
					, street: 			"Aarbergergasse"
					, no: 				41
					, zip: 				3011
					, city: 			"Bern"
					, country: 			"Switzerland"
					, countryCode: 		"CH"
				}
				, {
					  lastname: 		"van der Weg"
					, firstname: 		"Michael"
					, companyName: 		null
					, street: 			"Codestreet"
					, no: 				10
					, zip: 				3013
					, city: 			"Bern"
					, country: 			"Switzerland"
					, countryCode: 		"CH"
				}
			]
		}
	
	} );


example of a more complex query, we're fetching events, their categories and their venues. the language used for the multi language resources is the language from the request. this is implemented via support for subqueries. in the query below you the selection of the field «.order». this selects the attribute order from the mapping table. this attribute can also be used in the oirder statement. the field will be mapped on to the mapped records.


	// prepare language subquery ( which will be executed only once )
	var languageQuery = { language_id: db.events.lanaguage( { iso2: request.language }, [ id ] ) };

	// base query
	var query = db.events.event( { startdate: db.gt( new Date() ) }, { order: db.asc( "startdate", "name" ), limit: 10 }, [ "id", "startdate", "name" ] );

	// get categories
	query.tryGetCategories( [ "id" ] )
		 .tryGetCategoryLocale( languageQuery, [ "name" ] );

	// get venue
	query.tryGetVenues( [ "id", "name", "street", "no", "lat", "lon", ".order" ], { order: db.asc( ".order" ) } )
		 .tryFetchVenueLocale( languageQuery, [ "teaser", "description" ] )
		 .tryGetCity( [ "zip", "city" ] )
		 .tryFetchCityLocale( languageQuery )
		 .getMunicipality()
		 .tryFetchMunicipalityLocale( languageQuery )
		 .getDistrict()
		 .tryFetchDistrictLocale( languageQuery )
		 .getCounty()
		 .tryFetchCountyLocale( languageQuery )
		 .getCountry( [ "country", "iso2 countryCode" ] )
		 .tryFetchCountryLocale( languageQuery );


	query.execute( function( err, events ){


		[ 
			{
				  id: 			4
				, startdate: 	"..."
				, name: 		"Gramatik - Muy Tranquilo"
				, categories: 	[ {
					  id: 		5
					, name: 	"coder sounds"
				} ]
				, venues: []
			} 
			, ...
		]

		// update venue, set ordering on the mapping table to the maximim plus one. we can address the order column
		// in the mapping table directly because we fetched it via the event table, so the mapping is loaded already.
		// see below foir a standalone version.
		events.venues[ 1 ].set( ".order", db.events.event.getVenues( [ db.max( ".order" ] ).add( 1 ) ) );
	} );


each of the query trees will be executed separately becuase it will execute faster. the above query will execute four separate queries. one for getting the language, one for getting the base event data, one for the categories and one for the venues.


	// this will get the venue 45 for the event 1345, waits for the result, sets the order value on the mapping. 
	// this is a slow solution because it will load the record prior to changing it. see an alternative solution below
	db.events.event( 1345 ).getVenues( 45 ).set( ".order", db.events.event.getVenues( [ db.max( ".order" ] ).add( 1 ) ).save( function( err ){} );

	// this is a more direct approach. but it's still slow because the record is loaded prior to the update. see the fastest solution below.
	db.events.event_venue( { id_event: 1345, id_venue: 45 } ).set( ".order", db.events.event.getVenues( [ db.max( ".order" ] ).add( 1 ) ).save( function( err ){} );

	// this modifies the row directly without loading it.
	db.events.event_venue.update( { id_event: 1345, id_venue: 45 }, { order: db.events.event.getVenues( [ db.max( ".order" ] ).add( 1 ) }, function( err ){} );


deleteng stuff
	
	// remove venue 45 from event
	db.events.event.removeVenue( 45 );


