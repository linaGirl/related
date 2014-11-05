
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

        log(orm);

        db.venue.setMappingAccessorName('venue_image', 'image');

        db.event(['*'])
        .getVenue(['*'])
        .getImage(['*'])
        .find()
        .then(function(events) {
            log(events, events.length);


            for (var i = 0, l= events.length; i< l; i++) {
                log.highlight(i, events[i])
            }

            log.error('----');
            events.slice().forEach(function(evt, index) {
                log.warn(index, evt, evt.venue, !!evt.venue);

                if (evt.venue && evt.venue.image) {
                    log.warn('yes');
                    var images = evt.venue.image.slice();
                    log.wtf('wat?', images);
                    images.forEach(function(img){
                        log(img, img.venue, img.venues);
                    });
                }
            });
        })
        .catch(log);

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