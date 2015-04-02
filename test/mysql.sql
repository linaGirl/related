

DROP DATABASE IF EXISTS related_test_mysql;
CREATE DATABASE related_test_mysql;

SET storage_engine=INNODB;



CREATE TABLE related_test_mysql.language (
      id                INTEGER NOT NULL AUTO_INCREMENT
    , code              VARCHAR(2)
    , CONSTRAINT pk_language PRIMARY KEY (id)
    , CONSTRAINT unique_language_code UNIQUE (code)
);

CREATE TABLE related_test_mysql.image (
      id                INTEGER NOT NULL AUTO_INCREMENT
    , url               VARCHAR(300)
    , CONSTRAINT pk_image PRIMARY KEY (id)
);




CREATE TABLE related_test_mysql.country (
      id                INTEGER NOT NULL AUTO_INCREMENT
    , code              VARCHAR(2)
    , name              VARCHAR(200)
    , CONSTRAINT pk_country PRIMARY KEY (id)
    , CONSTRAINT unique_country_code UNIQUE(code)
);

CREATE TABLE related_test_mysql.county (
      id                INTEGER NOT NULL AUTO_INCREMENT
    , id_country        integer NOT NULL
    , code              VARCHAR(2)
    , name              VARCHAR(200)
    , CONSTRAINT pk_county PRIMARY KEY (id)
    , CONSTRAINT unique_county_code UNIQUE(code)
    , CONSTRAINT fk_county_country FOREIGN KEY (id_country) REFERENCES related_test_mysql.country(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE related_test_mysql.municipality (
      id                INTEGER NOT NULL AUTO_INCREMENT
    , id_county         integer NOT NULL
    , name              VARCHAR(200)
    , CONSTRAINT pk_municipality PRIMARY KEY (id)
    , CONSTRAINT fk_municipality_county FOREIGN KEY (id_county) REFERENCES related_test_mysql.county(id) ON UPDATE CASCADE ON DELETE RESTRICT
);




CREATE TABLE related_test_mysql.venue (
      id                INTEGER NOT NULL AUTO_INCREMENT
    , id_image          integer NOT NULL
    , id_municipality   integer NOT NULL
    , name              VARCHAR(200)
    , CONSTRAINT pk_venue PRIMARY KEY (id)
    , CONSTRAINT fk_venue_image FOREIGN KEY (id_image) REFERENCES related_test_mysql.image (id) ON UPDATE CASCADE ON DELETE RESTRICT
    , CONSTRAINT fk_venue_municipality FOREIGN KEY (id_municipality) REFERENCES related_test_mysql.municipality (id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE related_test_mysql.venue_image (
      id                INTEGER NOT NULL AUTO_INCREMENT
    , id_venue          integer NOT NULL
    , id_image          integer NOT NULL
    , CONSTRAINT pk_venue_image PRIMARY KEY (id)
    , CONSTRAINT unique_venue_image_venue_image UNIQUE (id_venue, id_image)
    , CONSTRAINT fk_venue_image_venue FOREIGN KEY (id_venue) REFERENCES related_test_mysql.venue (id) ON UPDATE CASCADE ON DELETE CASCADE
    , CONSTRAINT fk_venue_image_image FOREIGN KEY (id_image) REFERENCES related_test_mysql.image (id) ON UPDATE CASCADE ON DELETE CASCADE
);




CREATE TABLE related_test_mysql.event (
      id                INTEGER NOT NULL AUTO_INCREMENT
    , id_venue          integer NOT NULL
    , title             VARCHAR(200) NOT NULL
    , startdate         DATETIME NOT NULL
    , enddate           DATETIME
    , canceled          boolean
    , created           DATETIME
    , updated           DATETIME
    , deleted           DATETIME
    , CONSTRAINT pk_event PRIMARY KEY (id)
    , CONSTRAINT fk_event_venue FOREIGN KEY (id_venue) REFERENCES related_test_mysql.venue (id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE related_test_mysql.eventLocale (
      id_event          integer NOT NULL
    , id_language       integer NOT NULL
    , description       text NOT NULL
    , CONSTRAINT pk_eventLocale PRIMARY KEY (id_event, id_language)
    , CONSTRAINT fk_eventLocale_event FOREIGN KEY (id_event) REFERENCES related_test_mysql.event (id) ON UPDATE CASCADE ON DELETE CASCADE
    , CONSTRAINT fk_eventLocale_language FOREIGN KEY (id_language) REFERENCES related_test_mysql.language (id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE related_test_mysql.event_image (
      id_event          integer NOT NULL
    , id_image          integer NOT NULL
    , CONSTRAINT pk_event_image PRIMARY KEY (id_event, id_image)
    , CONSTRAINT fk_event_image_event FOREIGN KEY (id_event) REFERENCES related_test_mysql.event (id) ON UPDATE CASCADE ON DELETE CASCADE
    , CONSTRAINT fk_event_image_image FOREIGN KEY (id_image) REFERENCES related_test_mysql.image (id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE related_test_mysql.tree (
      id                INTEGER NOT NULL AUTO_INCREMENT
    , name              varchar(100)
    , `left`            integer NOT NULL
    ,` right`           integer NOT NULL
    , CONSTRAINT pk_tree PRIMARY KEY (id)
);


CREATE TABLE related_test_mysql.timeZoneTest (
      id                        serial NOT NULL
    , timstampWithTimezone      DATETIME
    , timstampWithoutTimezone   TIMESTAMP
    , CONSTRAINT pk_timeZoneTest PRIMARY KEY (id)
);



CREATE TABLE related_test_mysql.emptyTypes (
      id                        serial NOT NULL
    , bool                      boolean
    , num                    int
    , CONSTRAINT pk_emptyTypes PRIMARY KEY (id)
);


CREATE TABLE related_test_mysql.typeTest (
      id                        int not null PRIMARY KEY AUTO_INCREMENT
    , t_bit                     bit
    , t_bit_len                 bit (55)
    , t_tinyint                 tinyint 
    , t_tinyint_len             tinyint (2)
    , t_tinyint_default         tinyint default 6
    , t_bool                    bool
    , t_boolean                 boolean 
    , t_bool_default            bool default true
    , t_smallint                smallint 
    , t_smallint_len            smallint (4)
    , t_mediumint               mediumint 
    , t_int                     int 
    , t_int_len                 int (11 )
    , t_int_default             int default 69
    , t_integer                 integer
    , t_bigint                  bigint 
    , t_decimal                 decimal 
    , t_decimal_len             decimal (10,4)
    , t_dec                     dec
    , t_float                   float 
    , t_float_len               float (10, 4)
    , t_double                  double 
    , t_double_len              double (10,4)
    , t_double_precision        double 
    , t_double_precision_len    double (10,4)
    , t_float_alternative       float (12)
    , t_date                    date 
    , t_datetime                datetime
    , t_timestamp               timestamp
    , t_time                    time 
    , t_year                    year
    , t_year_len                year (2)
    , t_char                    char 
    , t_char_len                char (69)
    , t_varchar_len             varchar (69)
    , t_binary                  binary 
    , t_binary_len              binary (69)
    , t_varbinary_len           varbinary (34)
    , t_tinyblob                tinyblob 
    , t_tinytext                tinytext 
    , t_blob                    blob 
    , t_blob_len                blob (344)
    , t_text                    text 
    , t_text_len                text (333)
    , t_mediumblob              mediumblob 
    , t_mediumtext              mediumtext
    , t_longblob                longblob
    , t_longtext                longtext
);
