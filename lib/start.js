'use babel';

const connect = require('./connect');
const state = require('./state');
const config = require('./config');
const ut = require('./helpers/ut');
const dir = require('node-dir');

const log = require('./helpers/log');

import VersionManager from './components/version_manager';

import { CompositeDisposable } from 'atom';

export default {
    userliteLinkView: null,
    modalPanel: null,
    subscriptions: null,

    config: {
        userId: {
            type: 'integer',
            order: 1,
            default: 0
        },
        userPassphrase: {
            type: 'string',
            order: 2,
            default: ''
        },
        linkedProjectRoot: {
            type: 'string',
            description: 'Provide the full path to the folder to link with the dev environment.',
            order: 3,
            default: ''
        },
        connectTo: {
            type: 'string',
            description: 'Domain of live server.',
            order: 4,
            default: ''
        },
        connectToDev: {
            type: 'string',
            description: 'Domain of dev server.',
            order: 6,
            default: ''
        },
        connectToDevPort: {
            type: 'integer',
            description: 'Dev server port.',
            order: 7,
            default: 0
        },
        consoleLog: {
            type: 'boolean',
            order: 8,
            default: false
        }
    },

    // Setup the status bar and call the update status
    consumeStatusBar: function(statusBar) {
        state.statusBar = statusBar;
        state.set({ type: 'disconnected' });
    },

    dismissNotifications: function() {
        // Dismiss any outstanding notifications
        var notifications = atom.notifications.getNotifications();
        notifications.map(function(notice) {
            if (notice.options.userlitelink) notice.dismiss();
        });
    },

    setup: false,
    traffic: null,
    versionsPanel: null,
    versionManager: null,

    kickStart: function() {
        connect.initialize();

        if (!connect.active) return;

        if (!this.setup) {
            this.setup = true;

            this.traffic = connect.traffic;
            this.socket = connect.traffic.socket;

            var root = document.createElement('div');
            var elemId = 'react-versions-panel';

            root.id = elemId;

            this.versionsPanel = atom.workspace.addRightPanel({
                item: root
            });
            // Hide the versions panel initially
            this.versionsPanel.hide();

            this.versionManager = new VersionManager({
                socket: this.socket,
                elemId
            });
        }
    },

    activate(initialState) {
        this.kickStart();

        // Setup subscription container
        this.subscriptions = new CompositeDisposable();

        // Register command that toggles this view
        this.subscriptions.add(
            atom.commands.add('atom-workspace', {
                'userlite-link:connect': () => {
                    this.kickStart();
                },

                'userlite-link:clean': () => {
                    ut.cleanBuffer();
                },

                'userlite-link:download-current': () => {
                    if (!this.setup || !this.socket.connected)
                        return log('traffic', [
                            'Not setup!',
                            'download-current'
                        ]);
                    var editor = atom.workspace.getActiveTextEditor();
                    if (editor) this.traffic.downloadPath(editor.getPath());
                },

                'core:cancel': () => {
                    this.dismissNotifications();

                    if (!this.setup || !this.socket.connected) return;

                    if (this.versionsPanel) this.versionsPanel.hide();

                    this.traffic.closeErrorTrace();
                },

                'userlite-link:send-current-to-dev': event => {
                    if (!this.setup || !this.socket.connected) return;

                    var devId = event.target.getAttribute('data-devid');

                    var editor = atom.workspace.getActiveTextEditor();
                    if (!editor) return false;

                    var openPath = editor.getPath();

                    // Untitled editor
                    if (!openPath) return;

                    var filePath = openPath.substr(
                        config.getItem('linkedProjectRoot').length
                    );

                    var point = editor.getCursorBufferPosition();

                    this.traffic.send(
                        {
                            type: 'task',
                            task: 'send-open-file',
                            data: {
                                path: filePath,
                                point: point,
                                sendTo: devId
                            }
                        },
                        res => {
                            if (res.success) {
                                state.devConfirm(devId);
                            } else {
                                state.devFail(devId);
                            }
                        }
                    );
                },

                'userlite-link:toggle-error-console': () => {
                    if (!this.setup || !this.socket.connected) return;

                    return this.traffic.toggleErrorTrace();
                },

                'userlite-link:toggle-file-versions': () => {
                    if (!this.setup || !this.socket.connected) {
                        log('start', ['Not setup - file-versions.']);
                        return;
                    }

                    if (this.versionsPanel.isVisible()) {
                        this.versionsPanel.hide();
                    } else {
                        this.versionsPanel.show();
                    }
                },

                'userlite-link:reveal-active-file': () => {
                    // This function will reveal the active editor in the treeview

                    var editor = atom.workspace.getActiveTextEditor();
                    if (editor) {
                        var view = atom.views.getView(editor);
                        return atom.commands.dispatch(
                            view,
                            'tree-view:reveal-active-file'
                        );
                    }

                    // Or it will collapse the project view to a single level
                    ut.collapseTreeview();
                },

                'userlite-link:collapse-treeview': () => {
                    ut.collapseTreeview();
                },

                'userlite-link:download-selected': () => {
                    if (!this.setup || !this.socket.connected)
                        return console.warn('not setup');

                    var downloadDirs = Array.from(
                        document.querySelectorAll('.tree-view .selected')
                    ).map(item => {
                        if (item.getPath) return item.getPath();
                        return '';
                    });

                    downloadDirs.map(dirPath => {
                        this.traffic.downloadPath(dirPath);
                    });
                },

                'userlite-link:upload-selected': () => {
                    if (!this.setup || !this.socket.connected) return;

                    var uploadDirs = Array.from(
                        document.querySelectorAll('.tree-view .selected')
                    ).map(item => {
                        if (item.getPath) return item.getPath();
                        return '';
                    });

                    if (!uploadDirs) {
                        return atom.notifications.addWarning(
                            'No directories available.',
                            {
                                dismissable: true,
                                description: 'Select a directory to upload.',
                                userlitelink: true
                            }
                        );
                    }

                    uploadDirs.map(dirPath => {
                        dir.files(dirPath, (err, files) => {
                            if (err) throw err;
                            files.map(file => {
                                this.traffic.sendFile(file);
                            });
                        });
                    });
                },

                'userlite-link:disconnect': () => {
                    if (this.traffic) this.socket.disconnect();
                }
            })
        );
    },

    deactivate() {
        // Dispose subscriptions
        if (this.subscriptions) this.subscriptions.dispose();

        // Disconnect socket connection
        if (this.traffic) this.socket.disconnect();

        // Destory any existing version manager
        if (this.versionManager) this.versionManager.close();

        // Destroy any existing version panel
        if (this.versionsPanel) this.versionsPanel.destroy();
    }
};
