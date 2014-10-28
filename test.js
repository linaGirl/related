
	var   Class 		= require('ee-class')
		, log 			= require('ee-log')
		, async 		= require('ee-async')
		, ORM 			= require('./')
		, project 		= require('ee-project');


	var orm = new ORM(project.config.db);

	orm.on('load', function(err) {	
		var   db = orm.eventbooster
		 	, start
		 	, count = 0
		 	, failed = 0
		 	, completed = 0;

		log('orm loaded');

		var cb = function(err, item){
			if (err) log(err);
			if (item) item.dir();
		}


		db.condition(['*'])
            .fetchConditionType(['*'])
            .getCondition_tenant(['*'])
            .getArticle_conditionTenant(['*'])
            .getArticleInstanceCart_articleConditionTenant(['*'])
            .fetchConditionStatus(['*'])
            .getArticleInstance_cart(['*'])
            .getCart({
                id: 356
            }).find(log);

	});