

	var Class 		= require('ee-class')
		, log 		= require('ee-log')
		, async 	= require('ee-async')
		, ORM 		= require('./')
		, project 	= require('ee-project');


	var orm = new ORM(project.config);

	orm.on('load', function(err){
		log('orm loaded');
		setTimeout(function(){
			log('executing');

			var   role5
				, arr = []
			 	, start
			 	, i = 10000;

			while(i--) arr.push(1);
	//log(orm);

			start = Date.now();
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



			var query = orm.eventbox.event().limit(2).offset(6800);
			
			query.fetchVenues(['name', 'address']);
			query.fetchPerformers(['*']);
			query.getCategories(['id']).getCategoryLocales(['name']).getLanguage().filter({language: 'en'});
			query.fetchSales(['*']);

			query.fetchHighlightType(['name'], {id: ORM.notNull()});
		

			query.find(function(err, events){
				log.info('query took ' +( Date.now()-start) + ' ms ...');
				log(err);

				start = Date.now();
				log(events);
			});		

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
			});*/

		}, 200);
		
	});