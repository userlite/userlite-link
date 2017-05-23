const fs = require('fs-extra');
const path = require('path');
const dir = require('node-dir');

const config = require('../config');

function Mapper() {}

Mapper.prototype.validDirs = [];

Mapper.prototype.getCurrentBasePath = function() {
    var editor = atom.workspace.getActiveTextEditor();
    if (!editor) return false;
    var filepath = editor.getPath();

    return filepath.substr(config.getItem('linkedProjectRoot').length);
};

Mapper.prototype.validPath = function(path) {
    for (var i = 0; i < this.validDirs.length; i++) {
        if (path.indexOf(this.validDirs[i]) >= 0) {
            return true;
        }
    }

    return false;
};

Mapper.prototype.setValidDirs = function(directories) {
    this.validDirs = directories.map(function(directory) {
        return path.normalize(directory).replace(/\\/g, '/');
    });

    var root = config.getItem('linkedProjectRoot');

    // Remove folders that are not in the validDirs list
    dir.subdirs(root, (err, dirs) => {
        if (err) throw err;

        // Remove the config.getItem('linkedProjectRoot')
        dirs = dirs.map(function(file) {
            return file.substr(root.length);
        });

        // Filter out folders that start with __ or are deeper
        // than two directories
        dirs = dirs.filter(file => {
            var keeps = [
                file.split(path.sep).length <= 2,
                file.substr(0, 2) !== '__'
            ];

            return keeps.reduce((is, tf) => {
                return is ? tf : false;
            });
        });

        // Delete directories that still exist but aren't valid
        dirs.map(directory => {
            var destroy = true;
            for (var i = 0; i < this.validDirs.length; i++) {
                if (this.validDirs[i].indexOf(directory) >= 0) {
                    destroy = false;
                    break;
                }
            }

            if (destroy) console.log('destroy directory: ', directory);
            if (destroy) fs.remove(path.join(root, directory));
        });
    });
};

module.exports = new Mapper();
