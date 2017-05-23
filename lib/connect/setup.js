const fs = require('fs');
const log = require('../helpers/log');
const state = require('../state');
const config = require('../config');
const socket = require('socket.io-client');

function Setup() {
    if (!config.valid) return;
    var connectUrl = config.getItem('connectToUrl');

    var headers = {
        extraHeaders: {
            usl_user: config.getItem('userId'),
            usl_passphrase: config.getItem('userPassphrase'),
            usl_package_version: config.getItem('packageVersion')
        }
    };

    // Connect to the /atom namespace
    this.socket = socket(connectUrl + '/atom', headers);
}

Setup.prototype.start = function() {
    if (!config.valid) return;
    return this.socket.open();
};

Setup.prototype.end = function() {
    return this.socket.disconnect();
};

module.exports = new Setup();
