#ee-mysql-orm

*WARNING* this is currently not working!

object relationale mapper for node.js. reads the model directly from the database or defintion files.


# API

	var MySQLorm = require( "ee-mysql-orm" );

	var db = new MySQLorm( {
		hosts: [
			{
				  host: 			"myhost.tld"
				, role: 			"master"
				, user:				""
				, pass: 			""
				, maxConnections: 	100
			}
		]
	} );


	// the load event is fire when a connection could be established or when no connection could 
	// be established. in the latter case an error object will be passed as paremter 1
	// this event is only called on initial loading
	db.on( "load", 		function( err ){ console.log( "db loaded" ) } );

	// is fired when the db works in read only mode ( connected to slaves but not to the master )
	// this event is called always when the connection to the master is dropped or it cannot be 
	// established at startup
	db.on( "readOnly", 	function( err ){ console.log( "db loaded in read only mode" ) } );

	// is fired when no connection can be established
	// this event is fired always when no connection can be established
	db.on( "error", 	function( err ){ console.log( "" ) } );



The ORM will load the structure of all databases, tables and the relations between them. The ORM will update its structure every second to make sure it is in sync with the database.  You may also provide fixes via code for wrongly interpreted data structures.


	// after the laod event is fired the orm is ready and all properties should be set.


	// add a new user to the «user» table of the «events» db
	var michael = new db.events.user( { name: "michael" } ).save( function( err ){} );

	// add address, we need to get the city id for the address
	michael.addAddress( { firstname: "Michael", lastname: "van der Weg", street. "Aarbergergasse", no: 41, city: db.events.city.getOne( [ "id" ] ).getCityLocale( { name: "bern", language: this.db.language.getOne( { iso2: request.language }, [ id ] ) } ) }, function( err ){

	} );

	// retreive a user with the id «4» from the «events» database
	db.events.user.getOne( 4, function( err, user ){} );


retreive a user with the id «4» from the «events» database including his private address data. Users can have multiple address sets which are stored in the «address» table, that table  references a table «city», which references the table «municipality», which references the table «district», «municipality» which references the table «county», which references the table «country». The user has stored his prefererd language on his profile and the «city», «district», «county» and «country» tables have data in all languages stored on separate  tables. The statement below will create one query for the complete transaction, so it should be fast!. It will create joins for the 12 tables which will be used in this query. the tables containing the language data are joined using a left join, so there will be a result even  without data available for this query.

the fetch and get methods have the same effect, but the get method will return a reference to the object adressed by the get method. the fetch method will remain on the source object.

	db.events.user.getOne( { username: "eventEmitter" } )
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


example of a little more complex query, we're fetching events, their categories and their venues. the language used for the multi language resources is the language from the request. this is implemented via support for subqueries.


	// prepare language subquery ( which will be executed onla once )
	var languageQuery = { language_id: db.events.lanaguage.getOne( { iso2: request.language }, [ id ] ) };

	// base query
	var query = db.events.event.get( { startdate: db.gt( new Date() ) }, { order: db.desc, limit: 10 }, [ "id", "startdate", "name" ] );

	// get categories
	query.tryGetCategories( [ "id" ] )
		 .tryGetCategoryLocale( languageQuery, [ "name" ] );

	// get venue
	query.tryGetVenues( [ "id", "name", "street", "no", "lat", "lon" ] )
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
	} );


each of the query trees will be executed separately becuase it will execute faster.  the above query will execute four separate queries. one for getting the language, one for getting the base event data, one for the categires and one for the venues.