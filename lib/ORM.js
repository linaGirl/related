


	var   mysql 		= require( "mysql" )
		, Class 		= require( "ee-class" )
		, EventEmitter 	= require( "ee-event-emitter" )
		, log 			= require( "ee-log" )
		, type	 		= require( "ee-types" );


 //996003460200893689


	module.exports = new Class( {
		inherits: EventEmitter


		, hostIndex: 0

		, init: function( options ){
			if( this.parseConfig( options ) ){
				this.initialize();
			}
		}


		, initialize: function(){
			this.db = mysql.createPoolCluster( { defaultSelector: "ORDER" } );

			// add nodes
			this.hostconfig.forEach( function( config ){
				this.db.add( config.role + ( ++this.hostIndex ), config );
			}.bind( this ) );

			this.db.getConnection( "", function (err, connection) { log( err, connection ) });
		}


		, parseConfig: function( options ){
			if ( !options ) 					return this.emit( "error", new Error( "Missing options object! Cannot initialize the ORM without credentials!" ).setName( "InvalidParameterException" ) ), false;
			if ( !options.hosts ) 				return this.emit( "error", new Error( "Missing hosts configuration! Cannot initialize the ORM without credentials!" ).setName( "InvalidParameterException" ) ), false;
			if ( !type.array( options.hosts ) ) 	return this.emit( "error", new Error( "Hosts configuration must be typeof Array! Cannot initialize the ORM without credentials!" ).setName( "InvalidParameterException" ) ), false;
			if ( !type.objectArray( options.hosts ) || options.hosts.length === 0 ) 	return this.emit( "error", new Error( "Hosts configuration array must contains objects containing credentials! Cannot initialize the ORM without credentials!" ).setName( "InvalidParameterException" ) ), false;
			 
			for ( var i = 0, l = options.hosts.length; i< l; i++){
				var config = options.hosts[ i ];
				if ( !config.host ) return this.emit( "error", new Error( "Hosts config «"+i+"» is missing the «hosts» attribute!" ).setName( "InvalidParameterException" ) ), false;
				if ( !config.user ) return this.emit( "error", new Error( "Hosts config «"+i+"» is missing the «user» attribute!" ).setName( "InvalidParameterException" ) ), false;
				if ( !config.password ) return this.emit( "error", new Error( "Hosts config «"+i+"» is missing the «password» attribute!" ).setName( "InvalidParameterException" ) ), false;
				if ( !config.role ) return this.emit( "error", new Error( "Hosts config «"+i+"» is missing the «role» attribute!" ).setName( "InvalidParameterException" ) ), false;
				config.role = config.role.toLowerCase();
				if ( config.role !== "master" && config.role !== "slave" ) return this.emit( "error", new Error( "Hosts config «"+i+"» «role» attribute must be «master» or «slvae», found «"+config.role+"»!" ).setName( "InvalidParameterException" ) ), false;
			};

			this.hostconfig = options.hosts;
			return true;
		}
	} );