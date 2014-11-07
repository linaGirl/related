
	var   Class 		= require('ee-class')
		, log 			= require('ee-log')
		, assert 		= require('assert')
		, async 		= require('ee-async')
		, ORM 			= require('./')
		, project 		= require('ee-project');


	var orm = new ORM(project.config.db);

	orm.load(function(err) {	
		var   db = orm.ee_orm_test_postgres
		 	, start
		 	, count = 0
		 	, failed = 0
		 	, completed = 0;

		log('orm loaded');


		new db.image({
			  url: 'mapping deletion test'
			, event: db.event({id:2})
		}).save().then(function() {
			return db.event({id:2}, ['*']).getEvent_image('*').fetchImage(['*']).findOne();
		}).then(function(evt) {
			log(evt);
			return evt.event_image[0].delete();
		}).then(function() {
			return db.event({id:2}, ['*']).getEvent_image('*').fetchImage(['*']).findOne();
		}).then(function(evt) {
			log(evt);
		}).catch(log);

/*
		db.shop(['*'], {id: 1})
        .getSale({id: 23}, '*')
        .fetchSale_variant(['*'])
        .find()
        .then(function(data) {
        	log.highlight('round #1, data', data);
        	//throw new Error('thats it');

        	data[0].sale[23].sale_variant.splice(0, 1);
        	return data[0].sale[23].save();
        }).then(function(){
        	log.highlight('round #2');

    		return db.shop(['*'], {id:1})
	        .fetchAccount(['*'])
	        .getSale(['*'], {id:23})
	        .fetchSale_variant(['*']).find();
    	}).then(function(data){
        	log.highlight('round #3');

    		log(data);
    	}).catch(log)
*/
	});