(function() {
    
    // fixes the crappy proxy support of node 5.3.x    
    require('harmony-reflect');


    // export the orm
    module.exports = require('./src/Database');
    module.exports.Model = require('./src/Model');
})();
