const path = require('path');
const config = require('../config');

function Tabs(traffic) {
    this.traffic = traffic;
    this.disposables = [];
    this.openEditors = {};
    this.listeners = [];
}

Tabs.prototype.changeEditors = function(bufferBasePath, action, editor) {
    if (bufferBasePath.indexOf('__') === 0) return;

    this.listeners.forEach(function(listener) {
        listener({
            action: action,
            path: bufferBasePath,
            editor: editor
        });
    });

    if (action == 'destroy') {
        delete this.openEditors[bufferBasePath];

        return this.traffic.socket.send({
            type: 'active-editor-update',
            data: {
                action: 'destroy',
                path: bufferBasePath
            }
        });
    }

    this.openEditors[bufferBasePath] = {
        path: bufferBasePath,
        editor
    };

    this.traffic.socket.send({
        type: 'active-editor-update',
        data: { action, path: bufferBasePath }
    });
};

Tabs.prototype.addListener = function(listener) {
    this.listeners.push(listener);
};

Tabs.prototype.initialize = function() {
    var watchEditors = atom.workspace.observeTextEditors(editor => {
        // Ignore files stored in the root dir or in group folders
        var bufferBasePath = (editor.getPath() || '')
            .substr(config.getItem('baseDirLength'));
        if (bufferBasePath.split(path.sep).length < 2) return false;

        // Add/remove editor from openEditors
        this.changeEditors(bufferBasePath, 'add', editor);
        editor.onDidDestroy(() => {
            this.changeEditors(bufferBasePath, 'destroy');
        });

        var watchStop = editor.buffer.onDidStopChanging(function(event) {
            if (!event.changes) return;

            var changes = event.changes.map(function(change) {
                return {
                    range: {
                        start: change.start,
                        end: {
                            column: change.start.column +
                                change.oldExtent.column,
                            row: change.start.row + change.oldExtent.row
                        }
                    },
                    text: change.newText
                };
            });

            this.traffic.socket.send({
                type: 'buffer',
                data: {
                    path: bufferBasePath,
                    changes
                }
            });
        });

        this.disposables.push(watchStop);
    });

    this.disposables.push(watchEditors);
};

Tabs.prototype.close = function() {
    this.disposables.map(function(disposable) {
        disposable.dispose();
    });
    this.disposables = [];
};

Tabs.prototype.bufferUpdate = function(data) {
    if (!(data.path in this.openEditors)) return;

    // Make the changes
    var editor = this.openEditors[data.path].editor;
    data.changes.map(function(change) {
        editor.buffer.setTextInRange(change.range, change.text, {
            undo: 'skip'
        });
    });
};

module.exports = Tabs;
