
	
	var   Class 		= require('ee-class')
		, log 			= require('ee-log')
		, assert 		= require('assert')
		, travis 		= require('ee-travis')
		, async 		= require('ee-async')
		, fs 			= require('fs')
		, ORM 			= require('../');




	['POSTGRES'].forEach(function(db){
		var   config = JSON.parse(travis.get(db))
			, sqlStatments
			, key
			, orm
			, db;

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
				var db = orm.getDatabase('ee_orm_test').getConnection(function(err, connection){
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
				async.each(['en', 'de', 'nl', 'fr', 'it'], function(language, next){
					new db.language({code: language}).save(next);
				}, done);
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


			it('with a new mapped entity', function(done){
				new db.event({
					  title: 'Mapping Test'
					, startdate: new Date(0)
					, image: [new db.image({url: 'http://imgur.com/gallery/laxsJHr'})]
					, venue: db.venue({id:1})
				}).save(function(err, event){
					if (err) done(err);
					else {
						assert.equal(JSON.stringify(event), '{"image":[{"id":6,"url":"http://imgur.com/gallery/laxsJHr"}],"id":2,"venue":{"id":1,"name":"Dachstock Reitschule"},"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null}');
						done();
					}
				});
			});
		});

		

		// insert tests
		describe('Querying Data', function(){
			it('From an entitiy', function(done){
				db.event({id:1}).find(function(err, events){
					if (err) done(err);
					else {
						assert.equal(JSON.stringify(events), '[{"id":1,"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null}]');
						done();
					}
				});
			});

			it('From an entitiy including a reference', function(done){
				db.event({id:1}, ['*']).getVenue(['*']).find(function(err, events){
					if (err) done(err);
					else {
						assert.equal(JSON.stringify(events), '[{"id":1,"venue":{"id":1,"name":"Dachstock Reitschule"},"title":"Mapping Test","startdate":"1970-01-01T00:00:00.000Z","enddate":null,"canceled":null}]');
						done();
					}
				});
			});
		});
	});

