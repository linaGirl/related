

DROP SCHEMA IF EXISTS ee_orm_test_postgres CASCADE;
CREATE SCHEMA ee_orm_test_postgres;



CREATE TABLE ee_orm_test_postgres.language (
	  id  				serial NOT NULL
	, code  			character varying(2)
	, CONSTRAINT "pk_language" PRIMARY KEY (id)
	, CONSTRAINT "unique_language_code" UNIQUE (code)
);

CREATE TABLE ee_orm_test_postgres.image (
	  id 				serial NOT NULL
	, url 				character varying(300)
	, CONSTRAINT "pk_image" PRIMARY KEY (id)
);




CREATE TABLE ee_orm_test_postgres.country (
	  id 				serial NOT NULL
	, code 				character varying(2)
	, name  			character varying(200)
	, CONSTRAINT "pk_country" PRIMARY KEY (id)
	, CONSTRAINT "unique_country_code" UNIQUE(code)
);

CREATE TABLE ee_orm_test_postgres.county (
	  id 				serial NOT NULL
	, id_country 		integer NOT NULL
	, code 				character varying(2)
	, name  			character varying(200)
	, CONSTRAINT "pk_county" PRIMARY KEY (id)
	, CONSTRAINT "unique_county_code" UNIQUE(code)
	, CONSTRAINT "fk_county_country" FOREIGN KEY (id_country) REFERENCES ee_orm_test_postgres.country(id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE ee_orm_test_postgres.municipality (
	  id 				serial NOT NULL
	, id_county 		integer NOT NULL
	, name  			character varying(200)
	, CONSTRAINT "pk_municipality" PRIMARY KEY (id)
	, CONSTRAINT "fk_municipality_county" FOREIGN KEY (id_county) REFERENCES ee_orm_test_postgres.county(id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE RESTRICT
);




CREATE TABLE ee_orm_test_postgres.venue (
	  id 				serial NOT NULL
	, id_image			integer NOT NULL
	, id_municipality  	integer NOT NULL
	, name 				character varying(200)
	, CONSTRAINT "pk_venue" PRIMARY KEY (id)
	, CONSTRAINT "fk_venue_image" FOREIGN KEY (id_image) REFERENCES ee_orm_test_postgres.image (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE RESTRICT
	, CONSTRAINT "fk_venue_municipality" FOREIGN KEY (id_municipality) REFERENCES ee_orm_test_postgres.municipality (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE ee_orm_test_postgres.venue_image (
	  id 				serial NOT NULL
	, id_venue  		integer NOT NULL
	, id_image  		integer NOT NULL
	, CONSTRAINT "pk_venue_image" PRIMARY KEY (id)
	, CONSTRAINT "unique_venue_image_venue_image" UNIQUE (id_venue, id_image)
	, CONSTRAINT "fk_venue_image_venue" FOREIGN KEY (id_venue) REFERENCES ee_orm_test_postgres.venue (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE
	, CONSTRAINT "fk_venue_image_image" FOREIGN KEY (id_image) REFERENCES ee_orm_test_postgres.image (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE
);




CREATE TABLE ee_orm_test_postgres.event (
      id  				serial NOT NULL
    , id_venue 			integer NOT NULL
	, title  			character varying(200) NOT NULL
	, startdate 		timestamp without time zone NOT NULL
	, enddate 			timestamp without time zone
	, canceled 			boolean
	, created 			timestamp without time zone
	, updated 			timestamp without time zone
	, deleted 			timestamp without time zone
	, CONSTRAINT "pk_event" PRIMARY KEY (id)
	, CONSTRAINT "fk_event_venue" FOREIGN KEY (id_venue) REFERENCES ee_orm_test_postgres.venue (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE ee_orm_test_postgres."eventLocale" (
	  id_event  		integer NOT NULL
	, id_language  		integer NOT NULL
	, description  		text NOT NULL
	, CONSTRAINT "pk_eventLocale" PRIMARY KEY (id_event, id_language)
	, CONSTRAINT "fk_eventLocale_event" FOREIGN KEY (id_event) REFERENCES ee_orm_test_postgres.event (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE
	, CONSTRAINT "fk_eventLocale_language" FOREIGN KEY (id_language) REFERENCES ee_orm_test_postgres.language (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE ee_orm_test_postgres.event_image (
	  id_event  		integer NOT NULL
	, id_image  		integer NOT NULL
	, CONSTRAINT "pk_event_image" PRIMARY KEY (id_event, id_image)
	, CONSTRAINT "fk_event_image_event" FOREIGN KEY (id_event) REFERENCES ee_orm_test_postgres.event (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE
	, CONSTRAINT "fk_event_image_image" FOREIGN KEY (id_image) REFERENCES ee_orm_test_postgres.image (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE ee_orm_test_postgres.tree (
	  id 				serial NOT NULL
	, name 				varchar(100)
	, "left" 			integer NOT NULL
	, "right" 			integer NOT NULL
	, CONSTRAINT "pk_tree" PRIMARY KEY (id)
);

CREATE TABLE ee_orm_test_postgres."timeZoneTest" (
	  "id" 				 			serial NOT NULL
	, "timstampWithTimezone"  		timestamp with time zone
	, "timstampWithoutTimezone"  	timestamp without time zone
	, CONSTRAINT "pk_timeZoneTest" PRIMARY KEY (id)
);


CREATE TABLE ee_orm_test_postgres."emptyTypes" (
	  "id" 				 			serial NOT NULL
	, "bool"  						boolean
	, "num"  						int
	, CONSTRAINT "pk_emptyTypes" PRIMARY KEY (id)
);


CREATE TABLE ee_orm_test_postgres."selfJoin" (
	  "id" 				 			serial NOT NULL
	, "id_selfJoin"     			int
	, "text"  						varchar(200)
	, CONSTRAINT "pk_selfJoin_id" PRIMARY KEY (id)
	, CONSTRAINT "fk_selfJoin_selfJoin" FOREIGN KEY ("id_selfJoin") 
		REFERENCES ee_orm_test_postgres."selfJoin" (id) 
		ON UPDATE CASCADE 
		ON DELETE RESTRICT
);



CREATE TABLE ee_orm_test_postgres."typeTest" (
	  "serial" 						serial
	, "bigserial" 					bigserial
	, "serial8" 					serial8
	, "bigint" 						bigint
	, "bigint_default"				bigint DEFAULT 6
	, "int8" 						int8
	, "int8_default"				int8 DEFAULT 6
	, "bit" 						bit
	, "bit_len"						bit (69)
	, "bit_varying" 				bit varying
	, "bit_varying_len" 			bit varying (69)
	, "varbit" 						varbit
	, "boolean" 					boolean
	, "boolean_default"				boolean DEFAULT TRUE
	, "bool" 						bool
	, "box" 						box
	, "bytea" 						bytea
	, "character" 					character
	, "character_len" 				character (69)
	, "character_varying" 		 	character varying
	, "character_varying_len" 		character varying (69)
	, "cidr" 						cidr
	, "circle" 						circle
	, "date" 						date
	, "double_precision" 			double precision
	, "float8" 						float8
	, "inet" 						inet
	, "integer" 					integer
	, "int" 						int
	, "int4" 						int4
	, "interval" 					interval
	, "json" 						json
	, "line" 						line
	, "lseg" 						lseg
	, "macaddr" 					macaddr
	, "money" 						money
	, "numeric" 					numeric
	, "numeric_len" 				numeric (10, 4)
	, "path" 						path
	, "point" 						point
	, "polygon" 					polygon
	, "real" 						real
	, "float4" 						float4
	, "smallint" 					smallint
	, "int2" 						int2
	, "smallserial" 				smallserial
	, "serial2" 					serial2
	, "text" 						text
	, "time" 						time
	, "timetz" 						timetz
	, "time_without_time_zone" 		time without time zone
	, "time_with_time_zone" 		time with time zone
	, "timestamp" 					timestamp
	, "timestamp_default"			timestamp DEFAULT now()
	, "timestamptz" 				timestamptz
	, "timestamp_with_time_zone"  	timestamp with time zone
	, "timestamp_without_time_zone" timestamp without time zone
	, "tsquery" 					tsquery
	, "tsvector" 					tsvector
	, "txid_snapshot" 				txid_snapshot
	, "uuid" 						uuid
	, "xml" 						xml
	, CONSTRAINT "pf_typeTest" PRIMARY KEY ("serial")
);