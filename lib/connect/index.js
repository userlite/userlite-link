const setup = require('./setup');
const config = require('../config');
const ut = require('../helpers/ut');
const Traffic = require('../traffic');

function Connect() {
    this.valid = true;
    if (!config.valid) {
        this.valid = false;

        return void atom.notifications.addWarning(
            `Missing required ${atom.inDevMode() ? '**dev**' : '**live**'} configuration options.`,
            {
                description: `Open settings for the \`userlite-link\` package and add your configuration information.`,
                dismissable: true,
                icon: 'question',
                userlitelink: true
            }
        );
    }

    this.traffic = false;
}

// Initialize the connection
// returns true on success - false on failure
Connect.prototype.ini = function() {
    if (!this.valid) return;

    var pathMatches = atom.project.getPaths().filter(function(path) {
        return (
            path.indexOf(config.getItem('linkedProjectRootWithoutSlash')) === 0
        );
    });

    // We have at least one related project
    if (pathMatches.length) {
        var socket = setup.start();

        // Shutdown traffic module
        if (this.traffic === false) this.traffic = new Traffic(socket);

        return true;
    }

    return void setup.end();
};

Connect.prototype.end = function() {
    setup.end();
};

module.exports = new Connect();
