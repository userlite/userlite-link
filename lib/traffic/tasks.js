const fs = require('fs-extra');
const path = require('path');
const mapper = require('../helpers/mapper');
const config = require('../config');
const state = require('../state');
const AdmZip = require('adm-zip');

const store = require('../helpers/store');

function Tasks(traffic) {
    this.traffic = traffic;
    this.initDirs = [];
}

Tasks.prototype.pullMissingDirs = function() {
    if (this.initDirs.length) {
        return this.traffic.downloadPath(this.initDirs.shift());
    }
};

Tasks.prototype.fileVersions = function(data) {
    versionsModel.update(data);
};

Tasks.prototype.versionComparisons = function(data) {
    versionsModel.setDiffRows(data.diffGroups);
};

Tasks.prototype.fileVersionDownload = function(data) {
    var fileName = path.basename(data.path, path.extname(data.path));
    var dir = path.dirname(data.path);

    var saveTo = path.join(
        '__versions',
        `[${fileName}] ` +
            dir.split(/[/\\]/g).join('_') +
            path.extname(data.path)
    );

    store.saveFile(saveTo, data.buffer, {
        open: true,
        pending: true
    });
};

Tasks.prototype.initDirectories = function(data) {
    mapper.setValidDirs(data);

    var totalDirs = data.length;

    data.map(dir => {
        dir = path.join(
            config.getItem('linkedProjectRoot'),
            path.normalize(dir.replace(/\\/g, '/'))
        );
        fs.stat(dir, (err, stat) => {
            totalDirs--;
            if (err) this.initDirs.push(dir);
            if (!totalDirs) this.pullMissingDirs();
        });
    });
};

Tasks.prototype.devProfileUpdates = function(data) {
    state.showDevs(data);
};

Tasks.prototype.openPath = function(data) {
    // Convert the relative paths to absolute paths
    var pane = atom.workspace.getActivePane();
    var finished = false;
    var localPaths = [];

    for (var i = 0; i < data.paths.length; i++) {
        var local = store.getAbsolutePath(data.paths[i]);
        localPaths.push(local);

        finished = pane.activateItemForURI(local);
        if (finished) {
            if (data.point) {
                var editor = atom.workspace.getActiveTextEditor();
                editor.setCursorBufferPosition(data.point);
            }
            break;
        }
    }

    // If there wasn't an open editor already then just peel off
    // the first path and open it from disk
    if (!finished) store.openFile(localPaths.shift(), data);
};

Tasks.prototype.fileUpdate = function(data, cb) {
    // Save the file
    state.devActivity(data.updatedBy);
    store.saveFile(data.path, data.buffer, { cb });
};

Tasks.prototype.fileDelete = function(data, cb) {
    var deletePath = path.join(
        config.getItem('linkedProjectRoot'),
        path.normalize(data.path.replace(/\\/g, '/'))
    );

    if (data.updatedBy) state.devActivity(data.updatedBy);

    fs.remove(deletePath, function(err) {
        if (err) throw err;
        cb({ success: true });
    });
};

Tasks.prototype.zippedDirectory = function(data, cb) {
    // Every time we download a directory we check for any base
    // directories that haven't downloaded yet
    this.pullMissingDirs();

    var zipPath = path.join(config.getItem('linkedProjectRoot'), data.zipName);

    fs.writeFile(zipPath, data.buffer, function(err) {
        if (err) throw err;

        var zip = new AdmZip(zipPath);
        zipDir = path.parse(zipPath).dir;

        zip.extractAllTo(zipDir, true);

        if (typeof cb === 'function') cb({ complete: true });

        setTimeout(() => {
            fs.unlink(zipPath, err => {
                if (err)
                    log('warning', [
                        'Unable to unlink %s - directory does not exist.',
                        zipPath
                    ]);
            });
        }, 5000);
    });
};
module.exports = Tasks;
