const fs = require('fs');
const https = require('https');
const url = require('url');
const config = require('../config');
const mkdirp = require('mkdirp');
const path = require('path');

function Store() {}

Store.prototype.saveFileUrl = (relativePath, fullurl, options) => {
    var urlParts = url.parse(fullurl);
    var getOptions = {
        host: urlParts.host,
        path: urlParts.path,
        method: 'GET'
    };

    var req = https.request(getOptions, function(res) {
        res.setEncoding('utf8');
        res.on('data', function(buffer) {
            store.saveFile(relativePath, buffer, options);
        });
    });

    req.end();
};

Store.prototype.saveFile = (relativePath, buffer, options) => {
    if (typeof options !== 'object') options = {};

    var savePath = path.join(config.getItem('linkedProjectRoot'), relativePath);
    savePath = savePath.replace(/\\/g, '/');
    var saveDir = path.dirname(savePath);

    fs.open(saveDir, 'r', function(err) {
        var dur = 0;

        if (err) {
            dur = 200;
            mkdirp(saveDir);
        }

        setTimeout(() => {
            fs.writeFile(savePath, new Buffer(buffer), function(err) {
                if (err) throw err;

                if (options.cb) options.cb({ success: true });

                if (options.open) {
                    atom.workspace.open(savePath, {
                        pending: options.pending
                    });
                }
            });
        }, dur);
    });
};

Store.prototype.getAbsolutePath = relativePath => {
    var savePath = path.join(config.getItem('linkedProjectRoot'), relativePath);
    return savePath.replace(/\\/g, '/');
};

Store.prototype.openFile = (openPath, options) => {
    options = options || {};

    var openOps;

    if (options.point) {
        openOps = {
            initialLine: options.point.row,
            initialColumn: options.point.column
        };
        console.log('openOps', openOps);
    }

    fs.stat(openPath, function(err, stat) {
        if (err) {
            atom.notifications.addWarning('Unable to open path from peer.', {
                detail: openPath,
                userlitelink: true,
                dismissable: true
            });
        }

        atom.workspace.open(openPath, openOps);
    });
};

module.exports = new Store();
