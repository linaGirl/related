

	var Class 		= require('ee-class')
		, log 		= require('ee-log')
		, ORM 		= require('./')
		, project 	= require('ee-project');


	var orm = new ORM(project.config);

	orm.on('load', function(err){
		log('orm loaded');
		orm.eventbooster.user({id:1}).tenant({id:1}).find(function(err, users){
			log(err, users, users.first(), users.getIds());
		});
	});