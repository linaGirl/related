

	var Class 		= require('ee-class')
		, log 		= require('ee-log')
		, async 	= require('ee-async')
		, ORM 		= require('./')
		, project 	= require('ee-project');


	console.time("query")
	var orm = new ORM(project.config.db);

	orm.on('load', function(err){
		log('orm loaded');
			var   db = orm.ee_orm_test
			 	, start;


			log(orm);

			var cb = function(err, data){
				if (err) log(err);
				if (data && data.dir) data.dir();
			}


			db.event({title: ORM.like('Mapp%')}).find(cb);



			return;

			/*return new db.eventLocasle({
				  description 	: 'ssome text'
				, language 		: db.language({id:1})
				, event 		: db.event({id:1})
			}).save(log);*/
			var   i = 1000
				, ok = fail = 0
				, items = [];

			while(i--) items.push(i);

			setTimeout(function(){
				log.error('----------------');
				async.each(items, function(nope, cb){
					//db.event({id:1}).find(cb);
					//return;
					new db.event({
						  title: Math.random()
						, venue: db.venue()
						, startdate: new Date()
					}).save(function(err){
						if (err) fail++;
						else ok++;
						cb(err);
					});
				}, function(err){
					log.info(ok);
					log.error(fail);
					log(err);
				});
			}, 1500);
			

			/*
			orm.ee_orm_test.venue.setMappingAccessorName('venue_image', 'image');*/

			//log(orm.eventbooster.resource().describeMethods());

			/*var db = orm.ee_orm_test;

			db.venue.setReferenceAccessorName('id_image', 'logo');
			db.venue.setMappingAccessorName('venue_image', 'images');*/

			/*
			new db.venue({
				  name: 'Dachstock Reitschule'
				, municipality: db.municipality({
					name: 'Bern'
				})
				, id_image: 1
			}).save(function(err, image){
				log(err, image);
			});

*/
/*
			console.time("insert")
			new orm.eventbooster.resource({
				key: 'email.test.1'+Math.random()
				, id_tenant: 0
				, resourceLocale: new orm.eventbooster.resourceLocale({
					  id_language: 5
					, text: 'hi'
				})
				, language: [
					  orm.eventbooster.language({code: 'fr'})
					, orm.eventbooster.language({code: 'de'})
				]
			}).save(function(err, resource){ log(err);
				console.timeEnd("insert")	
			});
*/
			//orm.eventbooster.resourceLocale(['*'], {id_resource:63}).getResource(['*']).find(log)
return;
			
	/**
			// insert 1000 roles
			async.each(arr, function(input, next){
				new orm.autogantt.role({
					name: Math.random()
				}).save(false, function(err){
					if (err) log(err);
					next();
				});
			}

			, function(){
				log.info('query took ' +( Date.now()-start) + ' ms ...');
			});


	*/

			/*orm.eventbox.venue.setMappingAccessorName('venue_media', 'media');
			orm.eventbox.venue.setReferenceAccessorName('id_media', 'logo');*/


			//log(orm.eventbox.venue.getDefinition());

			var counter = 0;

			var exec = function(){
				console.time("query")
/*

				var query = orm.eventbox.event(['*'], {
					startdate: ORM.gt(new Date())
				}).limit(3).offset(0);

				var venue = query.getVenues(['*']);

				venue.getCity(['*'],{
					municipality: 'Bern'
				});




				query.find(function(err, events){
					log(err, events);
				});

*/
	//log(orm.eventbox.cityName(["*"]));
		/*
				orm.eventbox.city(["*"]).limit(10).get('cityName', ["*"]).find(function(err, list){
					log(err, list);
				})
return;
*/

				//orm.eventbox.event().describeMethods();

				/*
				var   transaction = orm.eventbox.createTransaction()
				 	, query = transaction.event(['*'], {_:[{id:3},{id:2}]}).limit(10).offset(0);

				
				query.getMapping('event_media');

				query.getEventLocale(['subtitle', 'description']).getLanguage().filter({language: 'de'});
				query.getVenue(['name', 'address'], {id: 82358}).fetchMapping('venue_media', ['*']).fetchReference('id_media', ['*']).getCity(["*"])
				query.getPerformer(['*']).getMedia(['*']);
				query.getCategory(['id']).getCategoryLocale(['name']).getLanguage().filter({language: 'de'});
				query.getSale(['*']);
				query.fetchMedia(['*']);
*/

				//query.fetchHighlightType(['name'], {id: ORM.notNull()});


				orm.eventbooster.resource(['key']).find(function(err, resources){
					console.timeEnd("query")
					log(err);
					//console.log(++counter);
					setTimeout(exec, 2000);

					log(resources);
					//events.first().reload();
					//log(JSON.stringify(resources));
					/*events.forEach(function(event){
						event.venues.forEach(function(venue){
							log(venue.getMapping('venue_media'));
						});
					});*/
					//transaction.commit();
				});	
			}

			
			exec();


			var insert = function(){
				var e = new orm.eventbox.event({
					title: 'test event'
				});

				e.venues.push(orm.eventbox.venue({id:555287}));

				e.save(function(err, evt){
					log(err, evt);
				});
			}


			//insert();


			var remove = function(){
				orm.eventbox.event({
					id: 243569
				}).findOne(function(err, event){
					if (err) log(err);
					else if (!event) log('event not found');
					else {
						event.delete(function(err){
							log(err);
						});
					}
				});
			}


			//remove();

			var removeDirect = function(){
				orm.eventbox.event({
					id: 243580
				}).limit(1).delete(function(err){
					log(err);
				});
			}


			//removeDirect();


			var update = function() {
				orm.eventbox.event({id:634534}).update({
					title: 'hui'
				}, function(err, info){

				})
			}


/*
			 SELECT 
			 `categoryLocale`.`name`
			 , `categoryLocale`.`id_category`
			 , `categoryLocale`.`id_language`
			 , `categoryLocale`.`id_category`
			 , `categoryLocale`.`id_language`
			 , `category`.`id` as ____id____ 
			 FROM `eventbox`.`categoryLocale` 
			 INNER JOIN `eventbox`.`event_category` as `event_category` ON `category`.`id`=`event_category`.`id_category` 
			 INNER JOIN `eventbox`.`event` as `event` ON `event_category`.`id_event`=`event`.`id` 
			 INNER JOIN `eventbox`.`category` as `category` ON `categoryLocale`.`id_category`=`category`.`id` 
			 WHERE `event`.`id`  in (131480, 131481);


			*/
	/*

			orm.autogantt.skill().fetchRoles(['*']).find(function(err, skills){
				log.info('query took ' +( Date.now()-start) + ' ms ...');
				log(err);
				log(skills);



				skills.forEach(function(skill){
					//skill.roles.push(new orm.autogantt.role({name: 'pereg'+Math.random()}));
				});
			});*/
	/*
			role5 = new orm.autogantt.role({
				name: Math.random()
			}).save(function(err, newRole){
				log.info('query took ' +( Date.now()-start) + ' ms ...');
				log(err, role5, newRole);
			});
*/
		
	});