(function() {
    'use strict';


    let Class       = require('ee-class');
    let type        = require('ee-types');
    let log         = require('ee-log');



    

    module.exports = new Class({


        // flags if all remaning listneres mus tbe skipped
        listenersSkipped: false


        // flags if the main action after
        // the event should be skipped
        , mainSkipped: false




        /**
         * set up
         */
        , init: function(eventName, eventParameters) {
            this.eventName = eventName;

            // apply the eventParameters to this opbject
            if (eventParameters) {
                Object.keys(eventParameters).forEach((key) => {
                    this[key] = eventParameters[key];
                });
            }
        }




        /**
         * set the mainSkipped flag
         *
         * @returns {promise}
         */
        , skipMain: function() {
            this.mainSkipped = true;

            return Promise.resolve();
        }




        /**
         * set the listenersSkipped flag
         *
         * @returns {promise}
         */
        , skipListeners: function() {
            this.listenersSkipped = true;

            return Promise.resolve();
        }




        /**
         * set the mainSkipped and listenersSkipped flag
         *
         * @returns {promise}
         */
        , skipMainAndListeners: function() {
            this.mainSkipped = true;
            this.listenersSkipped = true;

            return Promise.resolve();
        }




        /**
         * resume
         *
         * @returns {promise}
         */
        , resolve: function() {
            return Promise.resolve();
        }

    });
})();
