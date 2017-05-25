const util = require('util');
const config = require('../config');

var cats = {
    error: true,
    warning: true,
    life_cycle: true,
    cons: true,
    traffic: true,
    start: true,
    web_server: true,
    message: true,
    diffs: false,
    chrome: true,
    socket: true,
    versions: true,
    db: true,
    zip: true,
    ut: true,
    error_notice: true
};

module.exports = function(cat, value) {
    if (!config.getItem('consoleLog')) return;

    if (!cats[cat]) {
        if (cats[cat] === undefined) console.trace('Missing CAT!!! ', cat);
        return false;
    }

    if (cat === 'error') {
        return console.trace(
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
            return console.trace.apply(this, logArray);
        }

        return console.trace(util.inspect(value), '- ' + cat);
    }

    // String/Numbers
    return console.trace(value, '- ' + cat);
};
