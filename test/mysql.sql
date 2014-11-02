

DROP DATABASE IF EXISTS ee_orm_test_mysql;
CREATE DATABASE ee_orm_test_mysql;

SET storage_engine=INNODB;



CREATE TABLE ee_orm_test_mysql.language (
      id                INTEGER NOT NULL AUTO_INCREMENT
    , code              VARCHAR(2)
    , CONSTRAINT pk_language PRIMARY KEY (id)
    , CONSTRAINT unique_language_code UNIQUE (code)
);

CREATE TABLE ee_orm_test_mysql.image (
      id                INTEGER NOT NULL AUTO_INCREMENT
    , url               VARCHAR(300)
    , CONSTRAINT pk_image PRIMARY KEY (id)
);




CREATE TABLE ee_orm_test_mysql.country (
      id                INTEGER NOT NULL AUTO_INCREMENT
    , code              VARCHAR(2)
    , name              VARCHAR(200)
    , CONSTRAINT pk_country PRIMARY KEY (id)
    , CONSTRAINT unique_country_code UNIQUE(code)
);

CREATE TABLE ee_orm_test_mysql.county (
      id                INTEGER NOT NULL AUTO_INCREMENT
    , id_country        integer NOT NULL
    , code              VARCHAR(2)
    , name              VARCHAR(200)
    , CONSTRAINT pk_county PRIMARY KEY (id)
    , CONSTRAINT unique_county_code UNIQUE(code)
    , CONSTRAINT fk_county_country FOREIGN KEY (id_country) REFERENCES ee_orm_test_mysql.country(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE ee_orm_test_mysql.municipality (
      id                INTEGER NOT NULL AUTO_INCREMENT
    , id_county         integer NOT NULL
    , name              VARCHAR(200)
    , CONSTRAINT pk_municipality PRIMARY KEY (id)
    , CONSTRAINT fk_municipality_county FOREIGN KEY (id_county) REFERENCES ee_orm_test_mysql.county(id) ON UPDATE CASCADE ON DELETE RESTRICT
);




CREATE TABLE ee_orm_test_mysql.venue (
      id                INTEGER NOT NULL AUTO_INCREMENT
    , id_image          integer NOT NULL
    , id_municipality   integer NOT NULL
    , name              VARCHAR(200)
    , CONSTRAINT pk_venue PRIMARY KEY (id)
    , CONSTRAINT fk_venue_image FOREIGN KEY (id_image) REFERENCES ee_orm_test_mysql.image (id) ON UPDATE CASCADE ON DELETE RESTRICT
    , CONSTRAINT fk_venue_municipality FOREIGN KEY (id_municipality) REFERENCES ee_orm_test_mysql.municipality (id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE ee_orm_test_mysql.venue_image (
      id                INTEGER NOT NULL AUTO_INCREMENT
    , id_venue          integer NOT NULL
    , id_image          integer NOT NULL
    , CONSTRAINT pk_venue_image PRIMARY KEY (id)
    , CONSTRAINT unique_venue_image_venue_image UNIQUE (id_venue, id_image)
    , CONSTRAINT fk_venue_image_venue FOREIGN KEY (id_venue) REFERENCES ee_orm_test_mysql.venue (id) ON UPDATE CASCADE ON DELETE CASCADE
    , CONSTRAINT fk_venue_image_image FOREIGN KEY (id_image) REFERENCES ee_orm_test_mysql.image (id) ON UPDATE CASCADE ON DELETE CASCADE
);




CREATE TABLE ee_orm_test_mysql.event (
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
    , CONSTRAINT fk_event_venue FOREIGN KEY (id_venue) REFERENCES ee_orm_test_mysql.venue (id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE ee_orm_test_mysql.eventLocale (
      id_event          integer NOT NULL
    , id_language       integer NOT NULL
    , description       text NOT NULL
    , CONSTRAINT pk_eventLocale PRIMARY KEY (id_event, id_language)
    , CONSTRAINT fk_eventLocale_event FOREIGN KEY (id_event) REFERENCES ee_orm_test_mysql.event (id) ON UPDATE CASCADE ON DELETE CASCADE
    , CONSTRAINT fk_eventLocale_language FOREIGN KEY (id_language) REFERENCES ee_orm_test_mysql.language (id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE ee_orm_test_mysql.event_image (
      id_event          integer NOT NULL
    , id_image          integer NOT NULL
    , CONSTRAINT pk_event_image PRIMARY KEY (id_event, id_image)
    , CONSTRAINT fk_event_image_event FOREIGN KEY (id_event) REFERENCES ee_orm_test_mysql.event (id) ON UPDATE CASCADE ON DELETE CASCADE
    , CONSTRAINT fk_event_image_image FOREIGN KEY (id_image) REFERENCES ee_orm_test_mysql.image (id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE ee_orm_test_mysql.tree (
      id                INTEGER NOT NULL AUTO_INCREMENT
    , name              varchar(100)
    , `left`            integer NOT NULL
    ,` right`           integer NOT NULL
    , CONSTRAINT pk_tree PRIMARY KEY (id)
);