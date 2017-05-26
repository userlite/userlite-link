const setup = require('./setup');
const config = require('../config');
const ut = require('../helpers/ut');
const Traffic = require('../traffic');

function Connect() {
    this.traffic = false;
    this.active = false;
}

// Initialize the connection
// returns true on success - false on failure
Connect.prototype.initialize = function() {
    config.initialize();

    if (!config.valid) {
        this.active = false;

        atom.notifications.addWarning(`Invalid config options.`, {
            description: `Open settings for the \`userlite-link\` package and add your configuration information.`,
            dismissable: true,
            icon: 'question',
            userlitelink: true
        });

        return;
    }

    this.active = true;

    var socket = setup.start();

    // Shutdown traffic module
    if (this.traffic === false) this.traffic = new Traffic(socket);
};

module.exports = new Connect();
