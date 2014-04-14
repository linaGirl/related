

	var Class 		= require('ee-class')
		, log 		= require('ee-log')
		, async 	= require('ee-async')
		, ORM 		= require('./')
		, project 	= require('ee-project');


	console.time("query")
	var orm = new ORM(project.config);

	orm.on('load', function(err){
		log('orm loaded');
			var   role5
				, arr = []
			 	, start
			 	, i = 10000;

			while(i--) arr.push(1);
	//log(orm);

			log.wtf('hajo jüfe');
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

			orm.eventbox.venue.setMappingAccessorName('venue_media', 'media');
			orm.eventbox.venue.setReferenceAccessorName('id_media', 'logo');


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


				var   transaction = orm.eventbox.createTransaction()
				 	, query = transaction.event(['*']).limit(10).offset(0);

				
				query.getMapping('event_media');

				query.getEventLocale(['subtitle', 'description']).getLanguage().filter({language: 'de'});
				query.getVenue(['name', 'address'], {id: 82358}).fetchMapping('venue_media', ['*']).fetchReference('id_media', ['*']).getCity(["*"])
				query.getPerformer(['*']).getMedia(['*']);
				query.getCategory(['id']).getCategoryLocale(['name']).getLanguage().filter({language: 'de'});
				query.getSale(['*']);
				query.fetchMedia(['*']);


				//query.fetchHighlightType(['name'], {id: ORM.notNull()});


				query.find(function(err, events){
					console.timeEnd("query")
					log(err);
					//console.log(++counter);
					setTimeout(exec, 2000);

					//events.first().reload();
					log(JSON.stringify(events));
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