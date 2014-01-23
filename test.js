

	var Class 		= require('ee-class')
		, log 		= require('ee-log')
		, ORM 		= require('./')
		, project 	= require('ee-project');


	var orm = new ORM(project.config);

	orm.on('load', function(err){
		var role5;
		log('orm loaded');
		var start = Date.now();
/*
		
		orm.autogantt.skill().fetchRoles({id:1}, '*').find(function(err, users){
			log.info('query took ' +( Date.now()-start) + ' ms ...');
			log(err);
			log(users, users.first(), users.getIds());
			users[0].loadAll();

			var first = users.first();
			first.name = Math.random();
			first.save();
		});*/

		role5 = new orm.autogantt.role({
			name: Math.random()
		}).save(function(err, newRole){
			log.info('query took ' +( Date.now()-start) + ' ms ...');
			log(err, role5);
		});
	});