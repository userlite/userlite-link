const fs = require('fs');
const log = require('../helpers/log');
const state = require('../state');
const config = require('../config');

var connectUrl = config.getItem('connectToUrl');

var headers = {
    extraHeaders: {
        usl_user: config.getItem('userId'),
        usl_passphrase: config.getItem('userPassphrase'),
        usl_package_version: config.getItem('packageVersion')
    }
};

const socket = require('socket.io-client')(connectUrl + '/atom', headers);

module.exports = {
    start: function() {
        return socket.open();
    },
    end: function() {
        return socket.disconnect();
    }
};
