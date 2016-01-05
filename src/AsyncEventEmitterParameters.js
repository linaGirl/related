(function() {
    'use strict';



    class AsyncEventEmitterParameter {

        /**
         * set up
         */
        constructor(eventName, eventParameters) {
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
        skipMain() {
            this.mainSkipped = true;

            return Promise.resolve();
        }




        /**
         * set the listenersSkipped flag
         *
         * @returns {promise}
         */
        skipListeners() {
            this.listenersSkipped = true;

            return Promise.resolve();
        }




        /**
         * set the mainSkipped and listenersSkipped flag
         *
         * @returns {promise}
         */
        skipMainAndListeners() {
            this.mainSkipped = true;
            this.listenersSkipped = true;

            return Promise.resolve();
        }




        /**
         * resume
         *
         * @returns {promise}
         */
        resolve() {
            return Promise.resolve();
        }
    }



    // flags if all remaning listneres mus tbe skipped
    AsyncEventEmitterParameter.prototype.listenersSkipped = false;
    
    // flags if the main action after
    // the event should be skipped
    AsyncEventEmitterParameter.prototype.mainSkipped = false;
    

    // export the class
    module.exports = AsyncEventEmitterParameter;
})();
