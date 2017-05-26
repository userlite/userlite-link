const fs = require('fs');
const log = require('../helpers/log');
const state = require('../state');
const config = require('../config');
const socket = require('socket.io-client');

function Setup() {
    this.socket = false;
}

Setup.prototype.start = function() {
    if (!config.valid) return;

    if (this.socket === false) {
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

        this.socket.on('connect', function() {
            log('life_cycle', ['Socket connected!']);
            state.set({ type: 'connected' });
        });

        this.socket.on('disconnect', function() {
            log('life_cycle', ['Socket disconnected!']);
            state.set({ type: 'disconnected' });
        });
    }

    return this.socket.open();
};

module.exports = new Setup();
