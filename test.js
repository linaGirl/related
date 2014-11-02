
	var   Class 		= require('ee-class')
		, log 			= require('ee-log')
		, assert 		= require('assert')
		, async 		= require('ee-async')
		, ORM 			= require('./')
		, project 		= require('ee-project');


	var orm = new ORM(project.config.db);

	orm.load(function(err) {	
		var   db = orm.ee_orm_test
		 	, start
		 	, count = 0
		 	, failed = 0
		 	, completed = 0;

		log('orm loaded');

        log(orm);

		//db.event(['*']).find(log);

		/*var   evt       = db.event(['*'])
            , ed        = evt.getEventData(['*']);

        //ed.setLocale('de');

        // get some data
        ed.getImage(['id']);
        ed.getCategory(['*']).fetchImage(['id']);
        ed.getVenueFloor(['*']).fetchImage(['*']).getVenue(['*']).fetchImage(['id']);
        ed.getTag(['*']);

        // filter for events that are sold
        ed.getArticle().getCondition_tenant().getCondition({identifier: 'datatrans'});

        // filter for events that are curerntly sold and are free
        ed.getArticle().fetchArticleConfig(['*'], {
              amount 	: ORM.gt(0)
            , price 	: 0
        });

        evt.find(log);*/

	});