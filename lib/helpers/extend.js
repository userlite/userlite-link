module.exports = function() {
    // Variables
    var extended = {};
    var deep = false;
    var i = 0;
    var length = arguments.length;

    // Check if a deep merge
    if (Object.prototype.toString.call(arguments[0]) === '[object Boolean]') {
        deep = arguments[0];
        i++;
    }

    // Merge the object into the extended object
    function merge(obj) {
        for (var prop in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, prop)) {
                // If deep merge and property is an object, merge properties
                if (
                    deep &&
                    Object.prototype.toString.call(obj[prop]) ===
                        '[object Object]'
                ) {
                    extended[prop] = ui.extend(true, extended[prop], obj[prop]);
                } else {
                    if (obj[prop] === '__ui_extend_empty_object') {
                        extended[prop] = {};
                    } else if (obj[prop] === '__ui_extend_remove') {
                        delete extended[prop];
                    } else {
                        extended[prop] = obj[prop];
                    }
                }
            }
        }
    }

    // Loop through each object and conduct a merge
    for (; i < length; i++) {
        var obj = arguments[i];
        merge(obj);
    }

    return extended;
};
