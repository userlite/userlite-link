const setup = require('./setup');
const config = require('../config');
const ut = require('../helpers/ut');
const Traffic = require('../traffic');

module.exports = {
    traffic: false,
    // Initialize the connection
    // returns true on success - false on failure
    ini: function() {
        if (!config.valid) {
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

        var pathMatches = atom.project.getPaths().filter(function(path) {
            return (
                path.indexOf(
                    config.getItem('linkedProjectRootWithoutSlash')
                ) === 0
            );
        });

        // We have at least one related project
        if (pathMatches.length) {
            var socket = setup.start();
            if (!this.traffic) this.traffic = new Traffic(socket);
            return true;
        }

        return void setup.end();
    },

    end: function() {
        setup.end();
    },

    observeEditors: function(editor) {
        editor.buffer.onWillSave(event => {
            ut.cleanBuffer(editor);
            if (this.traffic) {
                this.traffic.editorSaved(editor);
            }
        });
    }
};
