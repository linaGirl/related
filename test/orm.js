
	
	var   Class 		= require('ee-class')
		, log 			= require('ee-log')
		, assert 		= require('assert')
		, async 		= require('ee-async')
		, fs 			= require('fs')
		, ORM 			= require('../');


	var expect = function(val, cb){
		return function(err, result){
			try {
				assert.equal(JSON.stringify(result), val);
			} catch (err) {
				return cb(err);
			}
			cb();
		}
	};



	['postgres', 'mysql'].forEach(function(dbType) {
		var   databaseName = 'ee_orm_test_'+dbType
			, config
			, sqlStatments
			, key
			, orm
			, db;


		try {
			config = require('../config-test.js').db.filter(function(config) {return config.schema === databaseName});
		} catch(e) {
			config = [];

			if (dbType === 'postgres') {
				config.push({
					  schema 		: 'ee_orm_test_postgres'
					, database 		: 'test'
					, type 			: 'postgres'
					, hosts: [{
						  host 		: 'localhost'
						, username 	: 'postgres'
						, password 	: ''
						, port 		: 5432
						, mode 		: 'readwrite'
						, maxConnections: 500
					}]
				});
			}
			else {
				config.push({
					  schema 		: 'ee_orm_test_mysql'
					, type 			: 'mysql'
					, hosts: [{
						  host 		: 'localhost'
						, username 	: 'root'
						, password 	: ''
						, port 		: 3306
						, mode 		: 'readwrite'
						, maxConnections: 20
					}]
				});
			}
		}



		// sql for test db
		sqlStatments = fs.readFileSync(__dirname+'/'+dbType+'.sql').toString().split(';').map(function(input){
			return input.trim().replace(/\n/gi, ' ').replace(/\s{2,}/g, ' ')
		}).filter(function(item){
			return item.length;
		});


		describe('['+dbType.toUpperCase()+']', function() {

			// connecting & rebvuilding the test database
			describe('The ORM', function(){
				it('should be able to connect to the database', function(done){
					this.timeout(5000);
					new ORM(config).load(function(err, ormObject) {
						if (err) done(err);
						else {
							orm = ormObject;
							done();
						}
					});
					//orm.on('load', done);
				});

				it('should be able to drop & create the testing schema ('+sqlStatments.length+' raw SQL queries)', function(done){
					orm.getDatabase(databaseName).getConnection(function(err, connection){
						if (err) done(err);
						else {
							async.each(sqlStatments, connection.queryRaw.bind(connection), done);
						}
					});				
				});

				it ('should be able to reload the models', function(done) {
					orm.reload(function(err){
						if (err) done(err);
						else {
							db = orm[databaseName];
							done();
						}
					});
				});
			});



			// inserting data into test database
			describe('Inserting Test Data', function() {
				it('into the language table', function(done) {
					var   index = 0
						, items
						, insert;

					insert = function(){
						if (index < items.length) {
							new db.language({code: items[index]}).save(function(err) {
								if (err) done(err);
								else insert();
							});
							index++;
						} else done();
					};

					items = ['en', 'de', 'nl', 'fr', 'it'];

					insert();
				});


				it('into the country table', function(done){
					async.each([
						  {code: 'ch', name: 'Switzerland'}
					], function(country, next){
						new db.country(country).save(next);
					}, done);
				});


				it('into the county table', function(done){
					var   index = 0
						, items
						, insert;

					insert = function(){
						if (index < items.length) {
							new db.county(items[index]).save(function(err){
								if (err) done(err);
								else insert();
							});
							index++;
						} else done();
					};

					items = [
						  {code: 'be', name: 'Bern', id_country: 1}
						, {code: 'zh', name: 'Zürich', id_country: 1}
						, {code: 'ge', name: 'Genf', id_country: 1}
					];

					insert();
				});

				it('into the municipality table', function(done){
					var   index = 0
						, items
						, insert;

					insert = function(){
						if (index < items.length) {
							new db.municipality(items[index]).save(function(err){
								if (err) done(err);
								else insert();
							});
							index++;
						} else done();
					};

					items = [
						  {name: 'Bern', id_county: 1}
						, {name: 'Ittigen', id_county: 1}
						, {name: 'Solothurn', id_county: 1}
					];

					insert();
				});
			});




			describe('Setting a new Accessor name for', function(){
				it('the «image» reference on the «venue model» using an invalid identifier should fail', function(){
					assert.throws(function(){
						db.venue.setReferenceAccessorName('id_images', 'logo');
					});
				});
				it('the «image» mapping on the «venue model»  using an invalid identifier should fail', function(){
					assert.throws(function(){
						db.venue.setMappingAccessorName('venue_imaged', 'image');
					});
				});


				it('the «image» reference on the «venue model»', function(){
					db.venue.setReferenceAccessorName('id_image', 'logo');
				});
				it('the «image» mapping on the «venue model»', function(){
					db.venue.setMappingAccessorName('venue_image', 'images');
				});
			});





			// insert tests
			describe('Inserting Data', function(){
				it('into an entity', function(done){
					var images = [
						  {url:'http://gfycat.com/ScentedPresentKingfisher.gif', expected:'{"id":1,"url":"http://gfycat.com/ScentedPresentKingfisher.gif"}'}
						, {url:'http://imgur.com/XVch57C', expected:'{"id":2,"url":"http://imgur.com/XVch57C"}'}
						, {url:'http://i.imgur.com/fYaV6tK.gif', expected:'{"id":3,"url":"http://i.imgur.com/fYaV6tK.gif"}'}
						, {url:'http://i.imgur.com/OQa6gbp.gif', expected:'{"id":4,"url":"http://i.imgur.com/OQa6gbp.gif"}'}
					];

					var insert = function(index){
						if (index < images.length){
							var config = images[index];

							new db.image({
								  url: config.url
							}).save(function(err, image){
								if (err) done(err);
								else {
									assert.equal(JSON.stringify(image), config.expected);								
									insert(++index);
								}
							});
						}
						else done();
					}
					
					insert(0);
				});


				it('with null as a column value should work', function(done){
					new db.country({
						  code: 'nl'
						, name: null
					}).save(done);
				});


				it('with a reference fetched using a query', function(done){
					new db.venue({
						  name: 'Dachstock Reitschule'
						, municipality: db.municipality(['*'], {
							name: 'Bern'
						})
						, id_image: 1
					}).save(function(err, image){
						if (err) done(err);
						else {
							assert.equal(JSON.stringify(image), '{"id":1,"municipality":{"id":1,"id_county":1,"name":"Bern"},"id_municipality":1,"name":"Dachstock Reitschule","id_image":1}');
							done();
						}
					});
				});


				it('with a newly created reference which has an ambiguous name should fail', function(done){
					try {
						new db.venue({
							  name: 'Dachstock Reitschule'
							, image: new db.image({url:'http://i.imgur.com/oP9R0pq.gif'})
							, municipality: db.municipality({
								name: 'Bern'
							})
						}).save();	
					} catch (err) {
						assert.ok(err instanceof Error);
						done();
					}
				});


				it('with a newly created reference on a redefined accessor', function(done){
					new db.venue({
						  name: 'Dachstock Reitschule'
						, logo: new db.image({url:'http://i.imgur.com/oP9R0pq.gif'})
						, images: [db.image({id:1})]
						, municipality: db.municipality({
							name: 'Bern'
						})
					}).save(done);	
				});


				it('with a mapped entity fetched using a query', function(done){
					new db.event({
						  title: 'Mapping Test'
						, startdate: new Date(0)
						, image: [db.image(['*'], {id: 1})]
						, venue: db.venue(['*'], {id:1})
					}).save(function(err, event){
						if (err) done(err);
						else {
							assert.equal(JSON.stringify(event), '{"image":[{"id":1,"url":"http://gfycat.com/ScentedPresentKingfisher.gif"}],"id":1,"venue":{"id":1,"id_municipality":1,"name":"Dachstock Reitschule","id_image":1},"id_venue":1,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null}');
							done();
						}
					});
				});


				it('with a new belongsto entity', function(done){
					new db.event({
						  title: 'Mapping Test'
						, startdate: new Date(0)
						, venue: db.venue(['*'], {id:1})
						, eventLocale: [new db.eventLocale({description: 'some text', language: db.language(['*'], {id:1})})]
					}).save(expect('{"eventLocale":[{"id_event":2,"language":{"id":1,"code":"en"},"id_language":1,"description":"some text"}],"id":2,"venue":{"id":1,"id_municipality":1,"name":"Dachstock Reitschule","id_image":1},"id_venue":1,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null}', done));
				});


				it('with a new mapped entity', function(done){
					new db.event({
						  title: 'Mapping Test'
						, startdate: new Date(0)
						, image: [new db.image({url: 'http://imgur.com/gallery/laxsJHr'})]
						, venue: db.venue(['*'], {id:1})
						, canceled: true
					}).save(expect('{"image":[{"id":6,"url":"http://imgur.com/gallery/laxsJHr"}],"id":3,"venue":{"id":1,"id_municipality":1,"name":"Dachstock Reitschule","id_image":1},"id_venue":1,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":true,"created":null,"updated":null,"deleted":null}', done));
				});
			});

			

			// query tests
			describe('Querying Data', function(){
 				it('from an entitiy', function(done){
					db.event({id:1}).find(function(err, events){
						if (err) done(err);
						else {
							assert.equal(JSON.stringify(events), '[{"id":1}]');
							done();
						}
					});
				});

				it('from an entitiy including a reference', function(done){
					db.event({id:1}, ['*']).getVenue(['*']).find(function(err, events){
						if (err) done(err);
						else {
							assert.equal(JSON.stringify(events), '[{"id":1,"venue":{"id":1,"id_municipality":1,"name":"Dachstock Reitschule","id_image":1},"id_venue":1,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null}]');
							done();
						}
					});
				});

				it('from an entitiy including a mapping', function(done){
					db.event({id:1}, ['*']).getImage(['*']).find(function(err, events){
						if (err) done(err);
						else {
							assert.equal(JSON.stringify(events), '[{"image":[{"id":1,"url":"http://gfycat.com/ScentedPresentKingfisher.gif"}],"id":1,"id_venue":1,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null}]');
							done();
						}
					});
				});

				it('from an entitiy including an entity belonging to the current entity', function(done){
					db.event({id:2}, ['*']).getEventLocale(['*']).find(function(err, events){
						if (err) done(err);
						else {
							assert.equal(JSON.stringify(events), '[{"eventLocale":[{"id_event":2,"id_language":1,"description":"some text"}],"id":2,"id_venue":1,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null}]');
							done();
						}
					});
				});
			});

			


			// complex query tests
			describe('Querying Data with advanced eager loading', function(){
				it('through a mapping table', function(done){
					db.event({id:2}).getEventLocale(['*']).fetchLanguage(['*']).find(function(err, events){
						if (err) done(err);
						else {
							assert.equal(JSON.stringify(events), '[{"eventLocale":[{"id_event":2,"language":{"id":1,"code":"en"},"id_language":1,"description":"some text"}],"id":2}]');
							done();
						}
					});
				});

				it('with two mapepd entities', function(done){
					db.image.setMappingAccessorName('venue_image', 'venue');

					db.event({id:1}).getImage(['*']).getVenue(['*']).find(expect('[{"image":[{"id":1,"url":"http://gfycat.com/ScentedPresentKingfisher.gif","venue":[{"id":2,"id_municipality":1,"name":"Dachstock Reitschule","id_image":5}]}],"id":1}]', done));
				});
			});



			describe('Queriying mutliple times on the same querybuilder', function(){
				it('should return the correct results', function(done){
					var query = db.event(['*']);
					query.getVenue(['*']);
					query.getVenue(['*'], {id: ORM.or([1,2,3,4])});
					query.getVenue(['*'], {name: ORM.like('Da%')});

					query.find(expect('[{"id":1,"venue":{"id":1,"id_municipality":1,"name":"Dachstock Reitschule","id_image":1},"id_venue":1,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null},{"id":2,"venue":{"id":1,"id_municipality":1,"name":"Dachstock Reitschule","id_image":1},"id_venue":1,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null},{"id":3,"venue":{"id":1,"id_municipality":1,"name":"Dachstock Reitschule","id_image":1},"id_venue":1,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":true,"created":null,"updated":null,"deleted":null}]', done));
				});
			});




			describe('Updating existing Data', function(){
				it('for a simple entity using the loaded model should work', function(done){
					db.event({id:1}).findOne(function(err, event){
						if (err) done(err);
						else {
							event.title = 'Changed title';
							event.save(expect('{"id":1,"id_venue":1,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null}', done));
						}
					});
				});

				it('for a simple entity with two updates using the loaded model should work', function(done){
					new db.event({
						  startdate: new Date()
						, title: 'bender'
						, venue: db.venue({id:1}, ['*'])
					}).save(function(err, event){
						if (err) done(err);
						else {
							event.title = 'Changed title';
							event.enddate = new Date(1400000000000);
							event.startdate = new Date(0);
							event.save(expect('{"id":4,"venue":{"id":1,"id_municipality":1,"name":"Dachstock Reitschule","id_image":1},"id_venue":1,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":"2014-05-13T16:53:20.000Z","canceled":null,"created":null,"updated":null,"deleted":null}', done));
						}
					});
				});

				it('with a reference fetched using a query', function(done){
					db.event({id:1}).findOne(function(err, event){
						if (err) done(err);
						else {
							event.venue = db.venue({id:2});
							event.save(function(err){
								if (err) done(err);
								else db.event({id:1},['*']).getVenue(['*']).findOne(expect('{"id":1,"venue":{"id":2,"id_municipality":1,"name":"Dachstock Reitschule","id_image":5},"id_venue":2,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null}', done));
							});
						}
					});
				});

				it('with a new reference', function(done){
					db.event({id:1}).findOne(function(err, event){
						if (err) done(err);
						else {
							event.venue = new db.venue({
								  name:  		'another venue'
								, logo:  		db.image({id:1})
								, municipality: db.municipality({id:1})
							});

							event.save(function(err){
								if (err) done(err);
								else db.event({id:1},['*']).getVenue(['*']).findOne(expect('{"id":1,"venue":{"id":3,"id_municipality":1,"name":"another venue","id_image":1},"id_venue":3,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null}', done));
							});
						}
					});
				});


				it('with a mapping fetched using a query', function(done){
					db.event({id:1}).findOne(function(err, event){
						if (err) done(err);
						else {
							event.venue = db.venue({id:2});
							event.image.push(db.image({id:3}));

							event.save(function(err) {
								if (err) done(err);
								else db.event({id:1},['*']).getImage(['*']).order('id', true).findOne(expect('{"image":[{"id":3,"url":"http://i.imgur.com/fYaV6tK.gif"},{"id":1,"url":"http://gfycat.com/ScentedPresentKingfisher.gif"}],"id":1,"id_venue":2,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null}', done));
							});
						}
					});
				});

				it('with a new mapping record', function(done){
					db.event({id:2}).findOne(function(err, event){
						if (err) done(err);
						else {
							event.venue = db.venue({id:2});
							event.image.push(new db.image({url:'http://i.imgur.com/1vjB9yu.gif'}));

							event.save(function(err){
								if (err) done(err);
								else db.event({id:2},['*']).getImage(['*']).findOne(expect('{"image":[{"id":7,"url":"http://i.imgur.com/1vjB9yu.gif"}],"id":2,"id_venue":2,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null}', done));
							});
						}
					});
				});


				it('with a new mapping record', function(done){
					db.event({id:2}).getImage(['*']).findOne(function(err, event){
						if (err) done(err);
						else {
							event.save(function(err){
								if (err) done(err);
								else db.event({id:2},['*']).getImage(['*']).findOne(expect('{"image":[{"id":7,"url":"http://i.imgur.com/1vjB9yu.gif"}],"id":2,"id_venue":2,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null}', done));
							});
						}
					});
				});

				/*it('with a belonging record fetched using a query', function(done){
					db.event({id:1}).findOne(function(err, event){
						if (err) done(err);
						else {
							event.venue = db.venue({id:2});
							event.eventLocale.push(db.eventLocale().getLanguage({id:1}).limit(1));

							event.save(function(err){
								if (err) done(err);
								else db.event({id:1},['*']).getEventLocale(['*']).findOne(expect('{"image":[{"id":3,"url":"http://i.imgur.com/fYaV6tK.gif"},{"id":1,"url":"http://gfycat.com/ScentedPresentKingfisher.gif"}],"id":1,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null}', done));
							});
						}
					});
				});*/
			});



			describe('[Ordering]', function(){
				it('should work :)', function(done){
					db.event(['*']).order('id', true).find(expect('[{"id":4,"id_venue":1,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":"2014-05-13T16:53:20.000Z","canceled":null,"created":null,"updated":null,"deleted":null},{"id":3,"id_venue":1,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":true,"created":null,"updated":null,"deleted":null},{"id":2,"id_venue":2,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null},{"id":1,"id_venue":2,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null}]', done));
				});

				it('should order the rootquery using a child resource', function(done) {
					db.event(['*'], {id: ORM.in(1,3)}).getVenue(['*']).orderRoot('id').find(expect('[{"id":3,"venue":{"id":1,"id_municipality":1,"name":"Dachstock Reitschule","id_image":1},"id_venue":1,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":true,"created":null,"updated":null,"deleted":null},{"id":1,"venue":{"id":2,"id_municipality":1,"name":"Dachstock Reitschule","id_image":5},"id_venue":2,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null}]', done));
				});
			});



			describe('[Grouping]', function(){
				it('should work :)', function(done){
					db.event(['id']).order('id').group('id').find(expect('[{"id":1},{"id":2},{"id":3},{"id":4}]', done));
				});

				/*it('with aggregate function count', function(done){
					db.event([ORM.count('id', 'eventCount')]).group('id').find(expect('[{"id":4},{"id":1},{"id":3},{"id":2}]', done));
				});*/
			});


			describe('[Limits & Offsets]', function() {
				it('the limit statement should work', function(done) {
					db.event(['*']).limit(2).find(function(err, events) {
						if (err) done(err);
						else {
							assert.equal(events.length, 2);
							done();
						}
					});
				});

				it('the offset statement should work', function(done) {
					db.event(['*']).offset(3).find(function(err, events) {
						if (err) done(err);
						else {
							assert.equal(events.length, 1);
							done();
						}
					});
				});
			});



			describe('[Chunked Loading]', function() {
				it('should work with classic callbacks', function(done) {
					var counter = 0;

					db.event(['*']).find(1, function(err, data, next, abort, last) {
						if (err) done(err);
						else if (!last) next(++counter);
						else {
							assert.equal(counter, 4);
							done();
						}
					});
				});

				it('should work using promises', function(done) {
					var counter = 0;

					db.event(['*']).find(2, function(err, data, next, abort, last) {
						if (err) done(err);
						else next(++counter);
					}).then(function() {
						assert.equal(counter, 3);
						done();
					}).catch(function(err) {
						done(err);
					});
				});

				it('should work when an offset is set', function(done) {
					var counter = 0;

					db.event(['*']).offset(2).find(2, function(err, data, next, abort, last) {
						if (err) done(err);
						else next(++counter);
					}).then(function() {
						assert.equal(counter, 2);
						done();
					}).catch(function(err) {
						done(err);
					});
				});
			});



			describe('[Filtering]', function(){
				it('Filter by a value', function(done){
					db.event(['*'], {id: 1}).findOne(expect('{"id":1,"id_venue":2,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null}', done));
				});

				it('Filter using null', function(done){
					db.event(['*'], {canceled: null}).order('id').find(expect('[{"id":1,"id_venue":2,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null},{"id":2,"id_venue":2,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null},{"id":4,"id_venue":1,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":"2014-05-13T16:53:20.000Z","canceled":null,"created":null,"updated":null,"deleted":null}]', done));
				});

				it('Filter using notNull', function(done){
					db.event(['*'], {canceled: ORM.notNull()}).find(expect('[{"id":3,"id_venue":1,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":true,"created":null,"updated":null,"deleted":null}]', done));
				});

				it('Using multiple values', function(done){
					db.event(['*'], {id: 1, title:'Changed title'}).findOne(expect('{"id":1,"id_venue":2,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null}', done));
				});

				it('Using multiple values on the same column', function(done){
					db.event(['*'], {id: ORM.in([1, 2])}).find(expect('[{"id":1,"id_venue":2,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null},{"id":2,"id_venue":2,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null}]', done));
				});

				it('Records with the > operator', function(done){
					db.event(['*'], {id: ORM.gt(2)}).find(expect('[{"id":3,"id_venue":1,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":true,"created":null,"updated":null,"deleted":null},{"id":4,"id_venue":1,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":"2014-05-13T16:53:20.000Z","canceled":null,"created":null,"updated":null,"deleted":null}]', done));
				});

				it('Records with the < operator', function(done){
					db.event(['*'], {id: ORM.lt(2)}).find(expect('[{"id":1,"id_venue":2,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null}]', done));
				});			

				it('Records with the >= operator', function(done){
					db.event(['*'], {id: ORM.gte(2)}).order('id').find(expect('[{"id":2,"id_venue":2,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null},{"id":3,"id_venue":1,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":true,"created":null,"updated":null,"deleted":null},{"id":4,"id_venue":1,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":"2014-05-13T16:53:20.000Z","canceled":null,"created":null,"updated":null,"deleted":null}]', done));
				});

				it('Records with the <= operator', function(done){
					db.event(['*'], {id: ORM.lte(2)}).find(expect('[{"id":1,"id_venue":2,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null},{"id":2,"id_venue":2,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null}]', done));
				});

				it('Filtering for two values using OR', function(done){
					db.event(['*'], {id: ORM.or(2,3)}).order('id').find(expect('[{"id":2,"id_venue":2,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null},{"id":3,"id_venue":1,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":true,"created":null,"updated":null,"deleted":null}]', done));
				});

				it('Filtering for two values using AND', function(done){
					db.event(['*'], {id: ORM.and(2,3)}).find(expect('[]', done));
				});

				it('Filtering for two values using OR and differet operators', function(done){
					db.event(['*'], {id: ORM.and(ORM.gt(2),3)}).find(expect('[{"id":3,"id_venue":1,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":true,"created":null,"updated":null,"deleted":null}]', done));
				});

				it('Filtering using the like operator', function(done){
					db.event(['*'], {title: ORM.like('Mapp%')}).order('id').find(expect('[{"id":2,"id_venue":2,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null},{"id":3,"id_venue":1,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":true,"created":null,"updated":null,"deleted":null}]', done));
				});

				it('Filtering using the notLike operator', function(done){
					db.event(['*'], {title: ORM.notLike('Mapp%')}).order('id').find(expect('[{"id":1,"id_venue":2,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null},{"id":4,"id_venue":1,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":"2014-05-13T16:53:20.000Z","canceled":null,"created":null,"updated":null,"deleted":null}]', done));
				});

				it('Filtering using the notEqual operator', function(done){
					db.event(['*'], {title: ORM.notEqual('hui')}).order('id').find(expect('[{"id":1,"id_venue":2,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null},{"id":2,"id_venue":2,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null},{"id":3,"id_venue":1,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":true,"created":null,"updated":null,"deleted":null},{"id":4,"id_venue":1,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":"2014-05-13T16:53:20.000Z","canceled":null,"created":null,"updated":null,"deleted":null}]', done));
				}); 



				/*it('Filtering using a subquery should work', function(done){
					db.event().getVenue({
						county: db.country({name: 'ch'}).get
					}).find(function(err, result){
						log(err, result);
					});
				});*/
			});
			
		


			describe('[Deleting]', function(){
				it('A model should be deleted when the delete method is called on it', function(done) {
					db.event({id:1}).findOne(function(err, evt){ 
						if (err) done(err);
						else {
							evt.delete(function(err){
								if (err) done(err);
								else {
									db.event(['*'], {id:1}).findOne(function(err, event) {
										if (err) done(err);
										assert.equal(event, undefined);
										done();
									});
								}
							});
						}
					});
				});


				it('should remove items from a related set when they are delted', function(done) {
					db.event({id:2}, ['*']).fetchImage(['*']).findOne(function(err, evt){
						if (err) done(err);
						else {
							evt.image[0].delete(function(err){
								if (err) done(err);
								else {
									assert.equal(JSON.stringify(evt), '{"image":[],"id":2,"id_venue":2,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null}');
									done();
								}
							});
						}
					});
				});


				it('should remove items from a related set which was explicitly loaded and items were removed', function(done) {
					new db.image({
						  url: 'mapping deletion test'
						, event: db.event({id:2})
					}).save().then(function() {
						return db.event({id:2}, ['*']).getEvent_image('*').fetchImage(['*']).findOne();
					}).then(function(evt) {
						assert.equal(JSON.stringify(evt), '{"event_image":[{"id_event":2,"image":{"id":8,"url":"mapping deletion test"},"id_image":8}],"id":2,"id_venue":2,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null}');
						return evt.event_image[0].delete();
					}).then(function() {
						return db.event({id:2}, ['*']).getEvent_image('*').fetchImage(['*']).findOne();
					}).then(function(evt) {
						assert.equal(JSON.stringify(evt), '{"id":2,"id_venue":2,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null}');
						done();
					}).catch(done);
				});
			});
			


			describe('[Forcing Joins]', function() {
				it('should join tables when told to do so', function(done) {
					db.event(['*']).joinEventLocale().find(expect('[{"id":2,"id_venue":2,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null}]', done));
				});

				it('should join multiple tables when told to do so', function(done) {
					db.event(['*']).joinVenue(true).joinImages().find(expect('[{"id":2,"id_venue":2,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null}]', done));
				});
			});




			describe('[Counting]', function() {
				it('should return the correct number', function(done) {
					db.event(['*']).joinVenue(true).joinImages().count(function(err, count) {
						if (err) done(err);
						else {
							assert.equal(count, 1);
							done();
						}
					}.bind(this));
				});
			});





			describe('[Inserting JS Types]', function() {
				it('with empty values should work', function(done) {
					new db.emptyTypes().save(expect('{"id":1,"bool":null,"num":null}', done));
				});

				it('with wrong types values should work', function(done) {
					new db.emptyTypes({
						  bool 	: 'true'
						, num 	: '33'
					}).save(expect('{"id":2,"bool":true,"num":33}', done));
				});

				it('with wrong types values II should work', function(done) {
					new db.emptyTypes({
						  bool 	: 'false'
						, num 	: '37s fsdfdsf'
					}).save(expect('{"id":3,"bool":false,"num":37}', done));
				});

				it('with correct types values should work', function(done) {
					new db.emptyTypes({
						  bool 	: true
						, num 	: 196
					}).save(expect('{"id":4,"bool":true,"num":196}', done));
				});
			});





			describe('[Advanced Filtering]', function() {
				it('should work', function(done) {
					var   query = db.event(['*']).order('id')
						, qb  	= query.queryBuilder();


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

					query.find(expect('[{"id":2,"id_venue":2,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null},{"id":3,"id_venue":1,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":true,"created":null,"updated":null,"deleted":null},{"id":4,"id_venue":1,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":"2014-05-13T16:53:20.000Z","canceled":null,"created":null,"updated":null,"deleted":null}]', done));
				});
			});
	

	

			describe('[Aggregate functions]', function() {
				it('Counting should work', function(done) {
					db.event(['*', ORM.count('id', 'idCount')])
					.joinVenue()
					.group('id')
					.order('id')
					.find(expect('[{"id":2,"id_venue":2,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null,"idCount":"1"},{"id":3,"id_venue":1,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":true,"created":null,"updated":null,"deleted":null,"idCount":"1"},{"id":4,"id_venue":1,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":"2014-05-13T16:53:20.000Z","canceled":null,"created":null,"updated":null,"deleted":null,"idCount":"1"}]', done));
				});
			});



			describe('[SET Methods]', function() {
				it('the toArray method should return the values as an plain array', function(done) {
					db.event('*').order('id').find().then(function(list) {
						list = list.toArray();
						list.length = 1;
						expect('[{"id":2,"id_venue":2,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null}]', done)(null, list);
					}).catch(done);
				});
			});





			describe('[Model Extending]', function() {
				it('should work', function(done) {
					var MyModel = new Class({
						inherits: ORM.Model

						, mutiply: function() {
							return this.id * 2;
						}
					});


					db.event.extend(MyModel);

					db.event(['*'], {id:2}).findOne(function(err, event) {
						if (err) done(err);
						else {
							assert.equal(event.id, 2);
							assert.equal(event.mutiply(), 4);
							done();
						}
					}.bind(this));
				});
			});





			describe('[Promises]', function() {
				it('should work for loading the ORM', function(done) { 
					var cfg = config[0];

					new ORM(cfg.hosts[0].username, cfg.hosts[0].password, cfg.hosts[0].host, databaseName, cfg.hosts[0].database, dbType).load().then(function(orm2) {
						assert.equal(JSON.stringify(orm2), '{"'+databaseName+'":{}}');
						done();
					}).catch(function(err) {
						done(err);
					});
				});

				it ('should work on queries', function(done) {
					db.event(['*']).joinVenue(true).joinImages().count().then(function(data){
						assert.equal(data, 1);

						return db.event(['id']).group('id').order('id').find();
					}).then(function(data) {
						assert.equal(JSON.stringify(data), '[{"id":2},{"id":3},{"id":4}]');
						done();
					}).catch(function(err){
						done(err);
					});
				});


				it ('should work when saving models', function(done) {
					db.event(['*'], {id: 3}).findOne().then(function(event){
						assert.equal(JSON.stringify(event), '{"id":3,"id_venue":1,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":true,"created":null,"updated":null,"deleted":null}');

						event.title = 'a changed one!';

						return event.save();
					}).then(function(event) {
						assert.equal(JSON.stringify(event), '{"id":3,"id_venue":1,"title":"a changed one!","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":true,"created":null,"updated":null,"deleted":null}');
						
						return db.event(['*'], {id: 3}).findOne();
					}).then(function(evt) {
						assert.equal(JSON.stringify(evt), '{"id":3,"id_venue":1,"title":"a changed one!","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":true,"created":null,"updated":null,"deleted":null}');
						
						done();
					}).catch(function(err){
						done(err);
					});
				});



				it ('should work when deleting models', function(done) {
					db.event(['*'], {id: 3}).findOne().then(function(event){
						assert.equal(JSON.stringify(event), '{"id":3,"id_venue":1,"title":"a changed one!","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":true,"created":null,"updated":null,"deleted":null}');

						return event.delete();
					}).then(function(event) {
						assert.equal(JSON.stringify(event), '{"id":3,"id_venue":1,"title":"a changed one!","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":true,"created":null,"updated":null,"deleted":null}');
						
						return db.event(['*'], {id: 3}).findOne();
					}).then(function(evt) {
						assert.equal(evt, undefined);
						
						done();
					}).catch(function(err){
						done(err);
					});
				});
			});
			
	


			describe('[Transactions]', function() {
				it('Executing queries should work', function(done) {
					var t = db.createTransaction();

					t.event('*').order('id').find().then(function(list) {
						list = list.toArray();
						list.length = 1;
						expect('[{"id":2,"id_venue":2,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null,"created":null,"updated":null,"deleted":null}]', done)(null, list);
						t.commit();
					}).catch(done);
				});


				it('Inserting new data should work', function(done) {
					var t = db.createTransaction();

					new t.event({
						  title: 'transaction test'
						, startdate: new Date(0)
						, image: [db.image(['*'], {id: 1})]
						, venue: db.venue(['*'], {id:1})
					}).save().then(function(evt){
						if (!evt) done(new Error('Failed to create event'));
						t.commit(done);
					}).catch(done);
				});
			});



			describe('[Migrations]', function() {
				
				it('should not crash when created', function() {
					var migration = orm.createMigration('0.1.3');
				});


				it('should return the serialized migration', function() {
					var migration = orm.createMigration('0.1.3');

					migration.describe('Setting up the test db ...');
					migration.dependsOn('ee-class', '1.0.x');

					migration.down = function() {};

					migration.up = function(transaction, callback) {
						var myDb;

				        transaction.createSchema('eventbooster').then(function(schema) {
				            myDb = schema;

				            return myDb.createTable('event', {
				                  id        : Related.Types.SERIAL
				                , title     : Related.Types.STRING(255) 
				            });
				        }.bind(this)).then(function() {
				            return myDb.createTable('image', {
				                  id        : Related.Types.SERIAL.notNull().index()
				                , title     : Related.Types.STRING(255).nullable()
				                , hasMany: [
				                    myDb.event
				                ]
				            });
				        }.bind(this)).catch(function(err) {
				            log.error('sorry pal, the migration failed!');
				            done(err);
				        }.bind(this));



				        myDb.drop().save();

				        myDb.myTable.drop().save();



				        myDb.myTable.column('id')
				            .loadValues(function(value, callback) {

				            })
				            .nullable(true)
				            .setType(Related.Types.INTEGER)
				            .setValues(function(value, callback) {

				            })
				            .nullable(false)
				            .save(callback);
					};

					var data = migration.serialize();
					data.up.body = data.up.body.substr(0, 200);

					assert.equal(JSON.stringify(data), '{"version":"0.1.3","dependecies":{"ee-class":"1.0.x"},"description":"Setting up the test db ...","up":{"arguments":["transaction","callback"],"body":"var myDb; transaction.createSchema(\'eventbooster\').then(function(schema) {myDb = schema; return myDb.createTable(\'event\', {id: Related.Types.SERIAL, title: Related.Types.STRING(255)});}.bind(this)).th"},"down":{"arguments":[],"body":""},"createDatababase":[],"createSchema":[]}');
				});
			});



			describe('[Connection Pooling]', function(){
				it('should be able to insert 1000 items in parallel', function(done){
					this.timeout(120000);

					async.each(Array.apply(null, {length: 1000}), function(nope, cb){
						new db.image({
							  url: Math.random()+""
						}).save(cb, true);
					}, done);
				});

				it('should be able to query 1000 items in parallel', function(done) {
					this.timeout(120000);

					async.each(Array.apply(null, {length: 1000}), function(nope, cb){
						db.event(['*']).find(cb);
					}, done);
				});
			});
		});
	});

