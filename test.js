
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


		log('orm loaded', orm);

		//return log(db.typeTest.getDefinition());

		db.timeZoneTest('*').debug().find(log);

		//return;

		new db.timeZoneTest({
			  timstampWithTimezone: '2015-01-20 08:00:00' // '2015-01-20T08:00:00.000Z'
			, timstampWithoutTimezone: '2015-01-20 08:00:00' // '2015-01-20T08:00:00.000Z'
		}).save().then(function(record) {
			log(record);
			return db.timeZoneTest('*', {id:record.id}).findOne();
		}).then(function(data) {
			log(data);
		}).catch(err);

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

/*



        / *
         * bring the query into the correcto format
         *
         * @param <String> SQL
         * @param <Mixed> object, array, null, undefined query parameters
         * /
        , _paramterizeQuery: function(SQLString, parameters) { //log(SQLString, parameters);
            var   values = []
                , reg = /\?([^\b,;\.\s]+)/gi
                , match; 

            // get a list of parameters from the string
            while (match = reg.exec(SQLString)) {
                //log(match[1]);
                values.push(parameters[match[1]]);
            }

            // replace
            reg.lastIndex = 0;


            return {
                  SQL: SQLString.replace(reg, '?')
                , values: values
            };
        }	



	 / *
         * bring the query into the correcto format
         *
         * @param <String> SQL
         * @param <Mixed> object, array, null, undefined query parameters
         * /
         , _paramterizeQuery: function(SQLString, parameters) { //log(SQLString, parameters);
            var   values = []
                , reg = /\?([a-z0-9_-]+)/gi
                , match; 

            // get a list of parameters from the string
            while (match = reg.exec(SQLString)) {
                //log(match[1]);
                values.push(parameters[match[1]]);
                SQLString = SQLString.replace(match[0], '$'+values.length);
                reg.lastIndex += ('$'+values.length).length-match[0].length;
            }

            // replace
            reg.lastIndex = 0;


            return {
                  SQL: SQLString //.replace(reg, '?')
                , values: values
            };
        }


        , _executeOneQuery: function(mode, query, callback) {
			var SQLString;

			query.SQLString += ';';

			// fill parameterized queries
			queryConfig = this._paramterizeQuery(query.SQLString, query.parameters);
			
			
			// execute the query
			this._query(queryConfig.SQL, queryConfig.values, callback);
		}

	
	, queryRaw: function() {
			var   SQLString		= arg(arguments, 'string')
				, callback 		= arg(arguments, 'function', function(){})
				, parameters	= arg(arguments, 'array', arg(arguments, 'object', {}))
				, readOnly 		= arg(arguments, 'boolean', true)
				, queryConfig;

			this._setBusy();

			queryConfig = this._paramterizeQuery(SQLString, parameters);

			//SQLString = this._fillSQL(SQLString, parameters);

			this._query(queryConfig.SQL, queryConfig.values, function(err, data) {
				callback(err, data);
				this._setIdle();
			}.bind(this));
		}

        */