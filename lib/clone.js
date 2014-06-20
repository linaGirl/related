!function(){

    var type = require('ee-types');

    module.exports = function(input) {
        var returnValue;

        switch(type(input)) {
            case 'array':
                returnValue = [];
                input.forEach(function(item){
                    returnValue.push(cloneObjectAndArrays(item));
                });
                return returnValue;
                break;

            case 'object':
                returnValue = {};
                Object.keys(input).forEach(function(key){
                    returnValue[key] = cloneObjectAndArrays(input[key]);
                });
                return returnValue;
                break;

            default:
                return input;
        }
    };
}();
