(function() {
    'use strict';


    let Class       = require('ee-class');
    let type        = require('ee-types');
    let log         = require('ee-log');




    

    module.exports = new Class({

        // storage for the user provided config
        userConfig: null




        /**
         * set up the related orm
         */
        , init: function(userConfig) {

            // some basic validation
            if (!type.object(userConfig)) throw new Error('Missing the config object!');
            if (!type.array(userConfig.hosts)) throw new Error('Missing the hosts array on the config object!');

            // store
            this.userConfig = userConfig;
        }












        /**
         * returns the driver to load for the cluster
         *
         * @returns {string} driverName
         */
        , getDriverName: function() {
            return this.userConfig.type || 'postgres';
        }












        /**
         * returns the name of the schema
         *
         * @returns {string} schemaName
         */
        , getSchemaName: function() {
            return this.userConfig.schema || this.userConfig.database;
        }












        /**
         * returns an array of host configs
         *
         * @returns {array}
         */
        , getHosts: function() {
            let hosts = [];

            for (let host of this.hosts()) hosts.push(host);

            return hosts;
        }















        /**
         * returns an iterator that can 
         * be used to iterate over the 
         * hosts of this config
         *
         * @returns {iterator protocol}
         */
        , hosts: function() {
            
            // return enclosed iterator
            return (() => {
                let index   = 0;
                let hosts   = this.userConfig.hosts;
                let config  = this.userConfig;

                return {
                    next: () => {
                        if (hosts.length > index) {
                            let host = hosts[index++];

                            return {
                                value: {
                                      database  : config.database
                                    , schema    : config.schema
                                    , type      : config.type || 'postgres'
                                    , pools     : host.pools || ['read', 'write']
                                    , pass      : host.pass || host.password || config.pass || config.password
                                    , user      : host.user || host.userName || config.user || config.userName
                                    , port      : host.port
                                    , host      : host.host || 'localhost'
                                    , max       : host.max || host.maxConnecctions
                                }
                                , done: false
                            };
                        }
                        else return {done: true};
                    }
                    , [Symbol.iterator]: function() {  
                        return this;
                    }
                };
            })();
        }
    });
})();
