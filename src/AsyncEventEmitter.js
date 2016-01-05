(function() {
    'use strict';


    let type = require('ee-types');
    let Parameters = require('./AsyncEventEmitterParameters');
    



    /**
     * this module depends on a predefined
     * $listeners Map, which cannot be declared here
     */

    
    let validEvents = new Set([
          'beforePrepareSave'
        , 'beforeSave'
        , 'afterSave'
        , 'beforePrepareDelete'
        , 'beforeDelete'
        , 'afterDelete'
        , 'beforePrepareUpdate'
        , 'beforeUpdate'
        , 'afterUpdate'
        , 'beforePrepareInsert'
        , 'beforeInsert'
        , 'afterInsert'
    ]);






    /**
     * emits eventlisteners async, checks if and
     * how to resume after each of the listeners
     * is called. the functions is outside of the 
     * class because it should not use namespace 
     * inside the class
     */
    let executeListeners = function(listeners, parameters, index) {
        if (listeners.length > index) {
            return listeners[index](parameters).then(() => {
                if (parameters.listenersSkipped || parameters.mainSkipped) return Promise.resolve(parameters);
                else return executeListeners(listeners, parameters, ++index);
            });
        }
        else return Promise.resolve(parameters);
    };







    class AsyncEventEmitter {

        /**
         * add an event listener
         *
         * @param {string} eventName the name of the event to listen for
         * @param {function} listener the function to call for the event
         * @param {boolean} once if the listener should be called only once
         *
         * @returns {object} this
         */
        on(eventName, listener, once) {
            if (!validEvents.has(eventName)) throw new Error(`The '${eventName}' is not a valid model event!`);
            else {
                if (!this.$listeners.has(eventName)) this.$listeners.set(eventName, new Set());

                this.$listeners.get(eventName).add({
                      type: once ? 'once' : 'on'
                    , listener: listener
                });

                return this;
            }
        }








        /**
         * add an event listener
         *
         * @param {string} eventName the name of the event to listen for
         * @param {function} listener the function to call for the event
         *
         * @returns {object} this
         */
        once(eventName, listener) {
            return this.on(eventName, listener, true);
        }










        /**
         * remove an event listener
         *
         * @param {string} eventName the name of the event to listen for
         * @param {function} listener the function to call for the event
         *
         * @returns {object} this
         */
        off(eventName, listener) {
            if (!validEvents.has(eventName)) throw new Error(`The '${eventName}' is not a valid model event!`);
            else {
                if (this.$listeners.has(eventName)) {
                    if (listener) this.$listeners.delete(listener);
                    else this.$listeners.delete(eventName);
                }

                return this;
            }
        }








        /**
         * emits an asyn event, checks for static event listeners
         * on the model and for lsiteners in the storage map
         * listeners are promises and must returns
         *
         * @param {string} eventName the name of the event to emit
         * @param {object} eventParameters a map of named parameters
         *
         * @returns {promise}
         */
        emit(eventName, eventParameters) {
            if (!validEvents.has(eventName)) return Promise.reject(new Error(`The '${eventName}' is not a valid model event!`));
            else {

                // get the name for the static model event listener
                let emitterName = `on${eventName[0].toUpperCase()}${eventName.slice(1)}`;

                // collect all listeners
                let listeners = [];

                // is there a local static lsitener?
                if (type.function(this[emitterName])) {
                    listeners.push({
                          listener: this[emitterName].bind(this) 
                        , type: 'on'
                    });
                }
                

                // are there any registered listeners
                if (this.$listeners.has(eventName)) {
                    listeners = listeners.concat(Array.prototype.slice.call(this.$listeners.get(eventName)));
                }


                if (listeners.length) {
                    // need a parameters object
                    let parameters = new Parameters(eventName, eventParameters);


                    // execute all lsiteners
                    return executeListeners(listeners, parameters, 0).then(() => {
                        return Promise.resolve(parameters.mainSkipped);
                    });
                }
                else return Promise.resolve(false);
            }
        }
    }



    module.exports = AsyncEventEmitter;
})();
