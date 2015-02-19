
	var   Class 		= require('ee-class')
		, log 			= require('ee-log')
		, assert 		= require('assert')
		, async 		= require('ee-async')
        , ORMTimestamps = require('../ee-orm-timestamps')
		, ORM 			= require('./')
		, project 		= require('ee-project');


	var orm = new ORM(project.config.db);



	orm.load(function(err) {	
		var   db = orm.ee_orm_test_postgres
		 	, start
		 	, count = 0
		 	, failed = 0
		 	, completed = 0;


		log('orm loaded', orm);


        db.event('*').getVenue('*').find(log);
        
        /*new db.selfJoin().save().then(function(item) {
            return new db.selfJoin({
                selfJoin: item
            }).save();
        }).catch(log);
        */
        //db.selfJoin('*').order('id', true).getSelfJoin('*').setDebugMode().find(log)

	});