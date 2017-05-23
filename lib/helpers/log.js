const util = require('util');

var cats = {
    error: true,
    warning: true,
    life_cycle: true,
    cons: true,
    traffic: true,
    web_server: true,
    message: true,
    chrome: true,
    socket: true,
    db: true,
    zip: true,
    ut: true,
    error_notice: true
};

module.exports = function(cat, value) {
    if (!atom.inDevMode()) return;

    if (!cats[cat]) {
        console.log('Missing CAT!!! ', cat);
        return false;
    }

    if (cat === 'error') {
        return console.log(
            '\n\n**** FATAL ERROR: ****\n',
            value.message,
            value.stack
        );
    }

    if (cat === 'warning') console.trace('**** WARNING: ****');

    // Objects/Arrays
    if (typeof value === 'object') {
        if (Array.isArray(value)) {
            var logArray = value;
            logArray.push('- ' + cat);
            return console.log.apply(this, logArray);
        }

        return console.log(util.inspect(value), '- ' + cat);
    }

    // String/Numbers
    return console.log(value, '- ' + cat);
};
