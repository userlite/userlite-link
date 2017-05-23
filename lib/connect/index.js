const setup = require('./setup');
const config = require('../config');
const ut = require('../helpers/ut');
const Traffic = require('../traffic');

var services = {
    traffic: false
};

module.exports = {
    ini: function() {
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
            if (!services.traffic) {
                services.traffic = new Traffic(socket);
            }
            return services;
        }

        return setup.end();
    },

    end: function() {
        setup.end();
    },

    observeEditors: function(editor) {
        editor.buffer.onWillSave(event => {
            ut.cleanBuffer(editor);
            if (services.traffic) {
                services.traffic.editorSaved(editor);
            }
        });
    }
};
