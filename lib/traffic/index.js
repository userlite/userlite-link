const fs = require('fs');
const config = require('../config');
const path = require('path');
const diffs = require('../helpers/diffs');
const ut = require('../helpers/ut');
const log = require('../helpers/log');
const Tasks = require('./tasks');
const Notices = require('./notices');
const Tabs = require('../tabs');
const state = require('../state');

var ErrorConsoleView = {
    view: null,
    createView: function() {
        var ErrorConsoleView;
        if (this.ErrorConsoleView == null) {
            ErrorConsoleView = require('../../views/error-console-view');
            this.ErrorConsoleView = new ErrorConsoleView();
        }
        return this.ErrorConsoleView;
    }
};

function Traffic(socket) {
    this.socket = socket;

    this.tasks = new Tasks(this);
    this.notices = new Notices(this);
    this.tabs = new Tabs(this);

    this.setPendingInitTasks();

    socket.on('connect', this.connect.bind(this));
    socket.on('message', this.receive.bind(this));
    socket.on('disconnect', this.disconnect.bind(this));

    socket.on('connect_error', function() {
        // log('socket', 'connect_error');
    });
    socket.on('connect_timeout', function() {
        log('socket', 'connect_timeout');
    });
    socket.on('error', function() {
        log('socket', 'error');
    });
}

Traffic.prototype.receive = function(message, cb) {
    // Convert the object
    message = ut.unbufferize(message);
    log('traffic', ['Message received:', message]);

    // Message is a Task
    if (message.type === 'task') {
        var task = ut.toCamelCase(message.task);

        if (typeof this.tasks[task] === 'function') {
            return this.tasks[task](message.data, cb);
        }

        // Error console task and other tasks can be handled here
        if (typeof this[task] === 'function') {
            return this[task](message.data, cb);
        }
        log('traffic', ['Missing handler for task: ' + task, message.data]);
    }

    // Message is a Task
    if (message.type === 'buffer') {
        return this.tabs.bufferUpdate(message.data, cb);
    }

    // Message is a notice
    if (message.type === 'notice') {
        this.handleNotice(message);
    }
};

Traffic.prototype.send = function(data) {
    this.socket.send(data);
};

Traffic.prototype.handleNotice = function(message) {
    if (message.status !== 200) {
        state.set({
            type: 'warning',
            message: message.notice
        });

        atom.notifications
            .addWarning(message.notice, {
                detail: message.detail,
                dismissable: true,
                userlitelink: true
            })
            .onDidDismiss(function() {
                state.done({
                    type: 'warning'
                });
            });
    }

    if (typeof this.notices[message.notice] === 'function') {
        return this.notices[message.notice](cb);
    }

    log('traffic', ['Missing handler for notice: ', message.notice]);
};

Traffic.prototype.connect = function() {
    log('life_cycle', 'Start it up!');
    // this.editorSaved(atom.workspace.getActiveTextEditor(), true);
    state.set({ type: 'connected' });

    if (!this.pendingInitTasks.length) this.pullUpdates();

    // Just a little activity for fun
    setTimeout(function() {
        state.allDevActivity();
    }, 300);
};

Traffic.prototype.disconnect = function() {
    log('life_cycle', ['its over!']);
    state.set({
        type: 'disconnected'
    });
};

Traffic.prototype.editorSaved = function(editor, force) {
    if (!editor) return;

    var comment = atom.config.get('userlite-link-comment') || '';
    atom.config.set('userlite-link-comment', null);

    // No changes found - not sending update.
    if (
        !force &&
        !comment &&
        editor.buffer.cachedDiskContents === editor.buffer.getText()
    )
        return;

    var fullPath = editor.getPath();

    var bufferBasePath = fullPath.substr(
        config.getItem('linkedProjectRoot').length
    ); // Plus one to remove the trailing slash

    if (bufferBasePath.indexOf('__versions') === 0) {
        atom.notifications.addWarning('You saved a version file.', {
            dismissable: true,
            description: 'This has no affect on remote files.',
            userlitelink: true
        });
        return false;
    }

    // Ignore double underscore local directories
    if (bufferBasePath.indexOf('__') === 0) return false;

    // Ignore files stored in the root dir or in group folders
    // if (bufferBasePath.split(path.sep).length < 3) return false;

    if (fullPath.indexOf(config.getItem('linkedProjectRoot')) === 0) {
        if (!this.socket || !this.socket.connected) {
            // Throwing here to stop save event so file stays in harmony
            // with dev server
            throw new Error('Not connected - cancelling save.');
        }

        var now = new Date().getTime();
        state.set({
            type: 'upload',
            message: 'Uploading ' + bufferBasePath,
            id: now
        });

        var sendBuffer = ut.bufferize(
            {
                type: 'task',
                task: 'file-update',
                data: {
                    fullpath: fullPath,
                    path: bufferBasePath,
                    comment: comment,
                    // An editor may be open with a mapping but may not be on
                    // disk. This would happen if you auto-nav to a file
                    // that hasn't been created yet
                    diffs: JSON.stringify(
                        diffs.getHTMLDiffs(
                            editor.buffer.cachedDiskContents || '',
                            editor.buffer.getText()
                        )
                    )
                }
            },
            new Buffer(editor.buffer.getText())
        );

        this.socket.send(sendBuffer, res => {
            // If the save isn't successful we're leaving the status bar
            // icon so we can look at the issue
            if (!res.success) return this.handleNotice(res);

            state.done({
                type: 'upload',
                id: now
            });
        });
    }
};

Traffic.prototype.errorTrace = function(data) {
    ErrorConsoleView.createView().update(data);
    this.showErrorTrace();
};

Traffic.prototype.closeErrorTrace = function() {
    ErrorConsoleView.createView().destroy();
};

Traffic.prototype.showErrorTrace = function() {
    atom.beep();
    ErrorConsoleView.createView().show();
};

Traffic.prototype.toggleErrorTrace = function() {
    ErrorConsoleView.createView().toggle();
};

// Traffic.prototype.closeVersionPanel = function() {
//     versionsModel.destroy();
// };

Traffic.prototype.setPendingInitTasks = function() {
    this.pendingInitTasks = ['init-directories'];
};

Traffic.prototype.initTaskComplete = function(message) {
    var index = this.pendingInitTasks.indexOf(message);

    // Already processed this init task
    // These can be called again when a devgroup change is pushed
    if (index < 0) return;

    this.pendingInitTasks.shift(index);

    if (!this.pendingInitTasks.length) {
        // this.tabs.initialize();
        this.pullUpdates();
    }
};

Traffic.prototype.loadVersionDiffs = function(filePath, versions) {
    this.socket.send({
        type: 'task',
        task: 'versions-comparison',
        data: {
            path: filePath,
            versions
        }
    });
};

Traffic.prototype.addCommentToVersion = function(data) {
    data.path = data.path.substr(config.getItem('linkedProjectRoot').length);

    this.socket.send({
        type: 'task',
        task: 'add-version-comment',
        data: data
    });
};

Traffic.prototype.getVersions = function(filepath) {
    if (!filepath) throw new Error('No path provided');

    this.socket.send({
        type: 'task',
        task: 'get-versions',
        data: {
            path: filepath
        }
    });
};

Traffic.prototype.pullUpdates = function() {
    var now = new Date().getTime();
    state.set({
        type: 'download',
        message: 'Pulling updates',
        id: now
    });

    this.socket.send(
        {
            type: 'task',
            task: 'pull-updates',
            data: {
                user: config.getItem('userId')
            }
        },
        (res, cb) => {
            if (res.updatesZip) {
                this.tasks.zippedDirectory({
                    zipName: 'pulled_updates.zip',
                    buffer: res.updatesZip
                });
            }
            if (res.deletes.length) {
                var baseDir = config.getItem('linkedProjectRoot');
                res.deletes.forEach(deletePath => {
                    deletePath = path.join(baseDir, deletePath);
                    fs.unlink(deletePath, err => {
                        if (err) throw err;
                    });
                });
            }
            this.socket.send({
                type: 'task',
                task: 'pull-updates-complete',
                data: {
                    user: config.getItem('userId')
                }
            });
            state.done({
                type: 'download',
                id: now
            });
        }
    );
};

Traffic.prototype.sendBuffer = function(editor) {
    throw new Error('Review this function');

    var comment = atom.config.get('userlite-link-comment') || '';
    atom.config.set('userlite-link-comment', null);

    // No changes found - not sending update.
    if (
        !comment &&
        editor.buffer.cachedDiskContents === editor.buffer.getText()
    )
        return;

    var fullPath = editor.getPath();

    var bufferBasePath = fullPath.substr(
        config.getItem('linkedProjectRoot').length
    ); // Plus one to remove the trailing slash

    if (bufferBasePath.indexOf('__versions') === 0) {
        atom.notifications.addWarning('You saved a version file.', {
            dismissable: true,
            description: 'This has no affect on remote files.',
            userlitelink: true
        });
        return false;
    }

    // Ignore double underscore local directories
    if (bufferBasePath.indexOf('__') === 0) return false;

    // Ignore files stored in the root dir or in group folders
    if (bufferBasePath.split(path.sep).length < 3) return false;

    if (fullPath.indexOf(config.getItem('linkedProjectRoot')) === 0) {
        if (!ob.conn || !ob.conn.connected) {
            // Throwing here to stop save event so file stays in harmony
            // with dev server
            throw new Error('Not connected - cancelling save.');
        }

        var now = new Date().getTime();
        state.set({
            type: 'upload',
            message: 'Uploading ' + bufferBasePath,
            id: now
        });

        var sendBuffer = ut.bufferize(
            {
                type: 'task',
                task: 'file-update',
                data: {
                    fullpath: fullPath,
                    path: bufferBasePath,
                    comment: comment,
                    // An editor may be open with a mapping but may not be on
                    // disk. This would happen if you auto-nav to a file
                    // that hasn't been created yet
                    diffs: JSON.stringify(
                        diffs.getHTMLDiffs(
                            editor.buffer.cachedDiskContents || '',
                            editor.buffer.getText()
                        )
                    )
                }
            },
            new Buffer(editor.buffer.getText())
        );

        ob.conn.sendBytes(sendBuffer, function() {
            console.log('Binary send complete - file-update');
            state.done({
                type: 'upload',
                id: now
            });
        });
    }
};

Traffic.prototype.sendFile = function(fullPath) {
    var bufferBasePath = fullPath.substr(
        config.getItem('linkedProjectRoot').length
    ); // Plus one to remove the trailing slash

    if (bufferBasePath.indexOf('__versions') === 0) {
        atom.notifications.addWarning('You saved a version file.', {
            dismissable: true,
            description: 'This has no affect on remote files.',
            userlitelink: true
        });
        return false;
    }

    // Ignore double underscore local directories
    if (bufferBasePath.indexOf('__') === 0) return false;

    // Ignore files stored in the root dir or in group folders
    if (bufferBasePath.split(path.sep).length < 3) return false;

    if (fullPath.indexOf(config.getItem('linkedProjectRoot')) === 0) {
        if (!ob.conn || !ob.conn.connected) {
            state.set({
                type: 'warning',
                message: 'Connection is down.'
            });

            return atom.notifications
                .addWarning('Connection is down.', {
                    userlitelink: true,
                    dismissable: true
                })
                .onDidDismiss(function() {
                    state.clearState('warning');
                });
        }

        var now = new Date().getTime();
        state.set({
            type: 'upload',
            message: 'Uploading ' + bufferBasePath,
            id: now
        });

        fs.readFile(fullPath, function(err, data) {
            var sendBuffer = ut.bufferize(
                {
                    type: 'task',
                    task: 'file-update',
                    data: {
                        fullpath: fullPath,
                        path: bufferBasePath
                    }
                },
                data
            );

            this.socket.send(sendBuffer, function() {
                log('traffic', ['Binary send complete:', bufferBasePath]);
                state.done({
                    type: 'upload',
                    id: now
                });
            });
        });
    }
};

Traffic.prototype.downloadPath = function(route) {
    if (route.indexOf(config.getItem('linkedProjectRoot')) !== 0) {
        log('warning', ['Trying to download bad directory:', route]);
        return;
    }

    route = route.substr(config.getItem('linkedProjectRoot').length);
    route = path.normalize(route);

    var now = new Date().getTime();
    state.set({
        type: 'download',
        message: 'Downloading ' + route,
        id: now
    });

    this.socket.send(
        {
            type: 'task',
            task: 'download',
            data: { route }
        },
        function(res) {
            state.done({
                type: 'download',
                id: now
            });
        }
    );
};

module.exports = Traffic;
