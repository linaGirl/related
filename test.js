

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


			

			var counter = 0;

			var exec = function(){
				console.time("query")


				var   transaction = orm//.transaction()
				 	, query = transaction.eventbox.event(['*'], {
				 		startdate: ORM.gt(new Date())
				 	}).limit(10).offset(100);

				

				query.getEventLocales(['subtitle', 'description']).getLanguage().filter({language: 'de'});
				query.getVenues(['name', 'address']).getMedia(['*']);
				query.getPerformers(['*']).getMedia(['*']);
				query.getCategories(['id']).getCategoryLocales(['name']).getLanguage().filter({language: 'de'});
				query.getSales(['*']);
				query.fetchMedia(['*']);


				//query.fetchHighlightType(['name'], {id: ORM.notNull()});


				query.find(function(err, events){
					console.timeEnd("query")
					log(err);
					//console.log(++counter);
					setTimeout(exec, 2000);

					events.first().prepare().reload();
					//log(events);
					//transaction.commit();
				});	
			}

			
			exec();
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