{
    'use strict';


    const EventEmitter = require('events');


    module.exports = class Lock extends EventEmitter {

        free() {
            this.emit('end');
        }
    }
}