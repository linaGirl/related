
	var   Class 		= require('ee-class')
		, log 			= require('ee-log')
		, async 		= require('ee-async')
		, ORM 			= require('./')
		, project 		= require('ee-project');


	var orm = new ORM(project.config.db);

	orm.on('load', function(err) {	
		var   db = orm.ee_orm_test
		 	, start
		 	, count = 0
		 	, failed = 0
		 	, completed = 0;

		log('orm loaded');

		var cb = function(err, item){
			if (err) log(err);
			if (item) item.dir();
		}



		var   query = db.event(['*'])
			, qb  	= query.queryBuilder();


		qb.and({
			  id: ORM.gt(0)
			}
			, qb.or({
					  'venue.name': ORM.like('re%')
					, 'venue.id_image': 5
				}
				, qb.and({
					  'venue.municipality.county.country.code': 'ch'
					, 'venue.municipality.county.code': 'be'
				})
			)
		);
		

		query.find(log);

	});