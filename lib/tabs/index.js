const path = require('path');
const config = require('../config');
const CompositeDisposable = require('atom').CompositeDisposable;

function Tabs(traffic) {
    this.traffic = traffic;
    this.disposables = new CompositeDisposable();
    this.openTabs = {};
    this.setup = false;
}

Tabs.prototype.initialize = function() {
    var watchEditors = atom.workspace.observeTextEditors(editor => {
        // Ignore files stored in the root dir or in group folders
        var bufferBasePath = (editor.getPath() || '')
            .substr(config.getItem('linkedProjectRoot').length);
        if (bufferBasePath.split(path.sep).length < 2) return false;

        // Add/remove editor from openTabs
        this.changeEditors(bufferBasePath, 'add', editor);

        editor.onDidDestroy(() => {
            this.changeEditors(bufferBasePath, 'destroy');
        });

        this.disposables.add(
            editor.buffer.onDidStopChanging(event => {
                if (!event.changes) return;

                if (!this.openTabs[bufferBasePath]) {
                    this.openTabs[bufferBasePath] = {
                        path: bufferBasePath,
                        changeFromRemote: false,
                        editor
                    };
                }

                if (this.openTabs[bufferBasePath].changeFromRemote) {
                    this.openTabs[bufferBasePath].changeFromRemote = false;
                    return;
                }

                this.traffic.socket.send({
                    type: 'buffer',
                    data: {
                        path: bufferBasePath,
                        buffer: editor.buffer.getText(),
                        cursorPosition: editor.getCursorBufferPosition()
                    }
                });
            })
        );
    });

    this.disposables.add(watchEditors);
};

Tabs.prototype.addEditors = function() {
    // Don't run this on the first connect since it's run on the
    // observeTextEditors method
    if (!this.setup) return (this.setup = true);
    atom.workspace.getTextEditors().forEach(editor => {
        // Ignore files stored in the root dir or in group folders
        var bufferBasePath = (editor.getPath() || '')
            .substr(config.getItem('linkedProjectRoot').length);
        if (bufferBasePath.split(path.sep).length < 2) return false;

        // Add/remove editor from openTabs
        this.changeEditors(bufferBasePath, 'add', editor);
    });
};

Tabs.prototype.changeEditors = function(bufferBasePath, action, editor) {
    if (bufferBasePath.indexOf('__') === 0) return;

    if (action == 'destroy') {
        delete this.openTabs[bufferBasePath];

        return this.traffic.socket.send({
            type: 'tab-subscribe',
            data: {
                action: 'destroy',
                path: bufferBasePath
            }
        });
    }

    this.openTabs[bufferBasePath] = {
        path: bufferBasePath,
        changeFromRemote: false,
        editor
    };

    this.traffic.socket.send({
        type: 'tab-subscribe',
        data: { action, path: bufferBasePath }
    });
};

Tabs.prototype.close = function() {
    this.disposables.dispose();
};

Tabs.prototype.bufferUpdate = function(data) {
    if (!(data.path in this.openTabs)) return;

    // Store that the most recent change is from the server so skip
    // the update
    this.openTabs[data.path].changeFromRemote = true;

    // Make the changes
    var editor = this.openTabs[data.path].editor;

    editor.buffer.setText(data.buffer);
    editor.setCursorBufferPosition(data.cursorPosition);
};

module.exports = Tabs;
