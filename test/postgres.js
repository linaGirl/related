
	
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



	['POSTGRES'].forEach(function(db){
		var   config
			, sqlStatments
			, key
			, orm
			, db;


		try {
			config = require('../config.js').db
		} catch(e) {
			config = {
				ee_orm_test: {
					  type: 'postgres'
					, hosts: [
						{
							  host 		: 'localhost'
							, username 	: 'postgres'
							, password 	: ''
							, port 		: 5432
							, mode 		: 'readwrite'
							, database 	: 'test'
						}
					]
				}
			};
		}


		// sql for test db
		sqlStatments = fs.readFileSync(__dirname+'/postgres.sql').toString().split(';').map(function(input){
			return input.trim().replace(/\n/gi, ' ').replace(/\s{2,}/g, ' ')
		}).filter(function(item){
			return item.length;
		});



		// connecting & rebvuilding the test database
		describe('The ORM', function(){
			it('should be able to connect to the database', function(done){
				this.timeout(5000);
				orm = new ORM(config);
				orm.on('load', done);
			});

			it('should be able to drop & create the testing schema ('+sqlStatments.length+' raw SQL queries)', function(done){
				orm.getDatabase('ee_orm_test').getConnection(function(err, connection){
					if (err) done(err);
					else {
						async.each(sqlStatments, connection.queryRaw.bind(connection), done);
					}
				});				
			});

			it ('should be able to reload the models', function(done){
				orm.reload(function(err){
					if (err) done(err);
					else {
						db = orm.ee_orm_test;
						done();
					}
				});
			});
		});



		// inserting data into test database
		describe('Inserting Test Data', function(){
			it('into the language table', function(done){
				var   index = 0
					, items
					, insert;

				insert = function(){
					if (index < items.length) {
						new db.language({code: items[index]}).save(function(err){
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
					, municipality: db.municipality({
						name: 'Bern'
					})
					, id_image: 1
				}).save(function(err, image){
					if (err) done(err);
					else {
						assert.equal(JSON.stringify(image), '{"id":1,"municipality":{"id":1,"name":"Bern"},"name":"Dachstock Reitschule"}');
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
					, image: [db.image({id: 1})]
					, venue: db.venue({id:1})
				}).save(function(err, event){
					if (err) done(err);
					else {
						assert.equal(JSON.stringify(event), '{"image":[{"id":1,"url":"http://gfycat.com/ScentedPresentKingfisher.gif"}],"id":1,"venue":{"id":1,"name":"Dachstock Reitschule"},"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null}');
						done();
					}
				});
			});


			it('with a new belongsto entity', function(done){
				new db.event({
					  title: 'Mapping Test'
					, startdate: new Date(0)
					, venue: db.venue({id:1})
					, eventLocale: [new db.eventLocale({description: 'some text', language: db.language({id:1})})]
				}).save(expect('{"eventLocale":[{"language":{"id":1,"code":"en"},"description":"some text"}],"id":2,"venue":{"id":1,"name":"Dachstock Reitschule"},"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null}', done));
			});


			it('with a new mapped entity', function(done){
				new db.event({
					  title: 'Mapping Test'
					, startdate: new Date(0)
					, image: [new db.image({url: 'http://imgur.com/gallery/laxsJHr'})]
					, venue: db.venue({id:1})
					, canceled: true
				}).save(expect('{"image":[{"id":6,"url":"http://imgur.com/gallery/laxsJHr"}],"id":3,"venue":{"id":1,"name":"Dachstock Reitschule"},"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":true}', done));
			});
		});

		

		// query tests
		describe('Querying Data', function(){
			it('from an entitiy', function(done){
				db.event({id:1}).find(function(err, events){
					if (err) done(err);
					else {
						assert.equal(JSON.stringify(events), '[{"id":1,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null}]');
						done();
					}
				});
			});

			it('from an entitiy including a reference', function(done){
				db.event({id:1}, ['*']).getVenue(['*']).find(function(err, events){
					if (err) done(err);
					else {
						assert.equal(JSON.stringify(events), '[{"id":1,"venue":{"id":1,"name":"Dachstock Reitschule"},"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null}]');
						done();
					}
				});
			});

			it('from an entitiy including a mapping', function(done){
				db.event({id:1}, ['*']).getImage(['*']).find(function(err, events){
					if (err) done(err);
					else {
						assert.equal(JSON.stringify(events), '[{"image":[{"id":1,"url":"http://gfycat.com/ScentedPresentKingfisher.gif"}],"id":1,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null}]');
						done();
					}
				});
			});

			it('from an entitiy including an entity belonging to the current entity', function(done){
				db.event({id:2}, ['*']).getEventLocale(['*']).find(function(err, events){
					if (err) done(err);
					else {
						assert.equal(JSON.stringify(events), '[{"eventLocale":[{"description":"some text"}],"id":2,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null}]');
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
						assert.equal(JSON.stringify(events), '[{"eventLocale":[{"language":{"id":1,"code":"en"},"description":"some text"}],"id":2}]');
						done();
					}
				});
			});

			it('with two mapepd entities', function(done){
				db.image.setMappingAccessorName('venue_image', 'venue');

				db.event({id:1}).getImage(['*']).getVenue(['*']).find(expect('[{"image":[{"id":1,"url":"http://gfycat.com/ScentedPresentKingfisher.gif","venue":[{"id":2,"name":"Dachstock Reitschule"}]}],"id":1}]', done));
			});
		});





		describe('Updating existing Data', function(){
			it('for a simple entity using the loaded model should work', function(done){
				db.event({id:1}).findOne(function(err, event){
					if (err) done(err);
					else {
						event.title = 'Changed title';
						event.save(expect('{"id":1,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null}', done));
					}
				});
			});

			it('for a simple entity with two updates using the loaded model should work', function(done){
				new db.event({
					  startdate: new Date()
					, title: 'bender'
					, venue: db.venue({id:1})
				}).save(function(err, event){
					if (err) done(err);
					else {
						event.title = 'Changed title';
						event.enddate = new Date(1400000000000);
						event.startdate = new Date(0);
						event.save(expect('{"id":4,"venue":{"id":1,"name":"Dachstock Reitschule"},"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":"2014-05-13T16:53:20.000Z","canceled":null}', done));
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
							else db.event({id:1},['*']).getVenue(['*']).findOne(expect('{"id":1,"venue":{"id":2,"name":"Dachstock Reitschule"},"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null}', done));
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
							else db.event({id:1},['*']).getVenue(['*']).findOne(expect('{"id":1,"venue":{"id":3,"name":"another venue"},"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null}', done));
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

						event.save(function(err){
							if (err) done(err);
							else db.event({id:1},['*']).getImage(['*']).findOne(expect('{"image":[{"id":3,"url":"http://i.imgur.com/fYaV6tK.gif"},{"id":1,"url":"http://gfycat.com/ScentedPresentKingfisher.gif"}],"id":1,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null}', done));
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
							else db.event({id:2},['*']).getImage(['*']).findOne(expect('{"image":[{"id":7,"url":"http://i.imgur.com/1vjB9yu.gif"}],"id":2,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null}', done));
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





		describe('[Filtering]', function(){
			it('Filter by a value', function(done){
				db.event({id: 1}).findOne(expect('{"id":1,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null}', done));
			});

			it('Filter using null', function(done){
				db.event({canceled: null}).find(expect('[{"id":4,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":"2014-05-13T16:53:20.000Z","canceled":null},{"id":1,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null},{"id":2,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null}]', done));
			});

			it('Filter using notNull', function(done){
				db.event({canceled: ORM.notNull()}).find(expect('[{"id":3,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":true}]', done));
			});

			it('Using multiple values', function(done){
				db.event({id: 1, title:'Changed title'}).findOne(expect('{"id":1,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null}', done));
			});

			it('Using multiple values on the same column', function(done){
				db.event({id: ORM.in([1, 2])}).find(expect('[{"id":1,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null},{"id":2,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null}]', done));
			});

			it('Records with the > operator', function(done){
				db.event({id: ORM.gt(2)}).find(expect('[{"id":3,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":true},{"id":4,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":"2014-05-13T16:53:20.000Z","canceled":null}]', done));
			});

			it('Records with the < operator', function(done){
				db.event({id: ORM.lt(2)}).find(expect('[{"id":1,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null}]', done));
			});			

			it('Records with the >= operator', function(done){
				db.event({id: ORM.gte(2)}).find(expect('[{"id":3,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":true},{"id":4,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":"2014-05-13T16:53:20.000Z","canceled":null},{"id":2,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null}]', done));
			});

			it('Records with the <= operator', function(done){
				db.event({id: ORM.lte(2)}).find(expect('[{"id":1,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null},{"id":2,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null}]', done));
			});

			it('Filtering for two values using OR', function(done){
				db.event({id: ORM.or(2,3)}).find(expect('[{"id":3,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":true},{"id":2,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null}]', done));
			});

			it('Filtering for two values using AND', function(done){
				db.event({id: ORM.and(2,3)}).find(expect('[]', done));
			});

			it('Filtering for two values using OR and differet operators', function(done){
				db.event({id: ORM.and(ORM.gt(2),3)}).find(expect('[{"id":3,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":true}]', done));
			});

			it('Filtering the like operator', function(done){
				db.event({title: ORM.like('Mapp%')}).find(expect('[{"id":3,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":true},{"id":2,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null}]', done));
			});

			it('Filtering the notLike operator', function(done){
				db.event({title: ORM.notLike('Mapp%')}).find(expect('[{"id":4,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":"2014-05-13T16:53:20.000Z","canceled":null},{"id":1,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null}]', done));
			});

			it('Filtering the notEqual operator', function(done){
				db.event({title: ORM.notEqual('hui')}).find(expect('[{"id":3,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":true},{"id":4,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":"2014-05-13T16:53:20.000Z","canceled":null},{"id":1,"title":"Changed title","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null},{"id":2,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null}]', done));
			}); 
		});



		describe('Connection Pooling', function(){
			it('should be able to insert 1000 items at once', function(done){
				var   i = 1000
					, items = [];

				this.timeout(120000);

				while(i--) items.push(i);

				async.each(items, function(nope, cb){
					new db.event({
						  title: Math.random()
						, venue: db.venue({id:1})
						, startdate: new Date()
					}).save(cb);
				}, done);
			});
		});
	});

