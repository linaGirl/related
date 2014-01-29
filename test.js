

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

			var query = orm.eventbox.event().limit(10).offset(6800);
			log(query.getCategories(['id']));
			query.fetchVenues(['name', 'address']);
			query.fetchPerformers(['*']);
			query.getCategories(['id']).getCategoryLocales(['name']).getLanguages().filter({language: 'de'});
			query.fetchSales(['*']);

			query.fetchHighlightType(['name']);
		

			query.find(function(err, events){
				log.info('query took ' +( Date.now()-start) + ' ms ...');
				log(err);
				//log(events);
			});		
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