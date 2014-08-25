
	require('heapdump');

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

		var tagname = Math.random();

		new db.tag({name: tagname}).save(function(){
			var thread = function() {
				var interval = setInterval(function() {
					db.venue(['*'], {
		                 id : ++count
		            }).findOne(function(err, venue){
		                if (!err && venue) {
		                	//venue.tag.push(db.tag({name: tagname}));
		                	venue.name = Math.random();
							venue.save(function(err) {
		                        if (err && ++failed%100 === 0) log.error(failed);
		                        else if (++completed%100 === 0) log.warn(completed);
		                        if (completed > 20000) clearInterval(interval);
		                    });
		                }
		            });
				}, 1000);
			}
			
			setInterval(function() {
				if (global.gc) global.gc();
			}, 3000);

			var i = 200;
			while(i--) thread();
		});			
	});