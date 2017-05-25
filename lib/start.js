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
    commandSubscriptions: null,

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
    },

    dismissNotifications: function() {
        // Dismiss any outstanding notifications
        var notifications = atom.notifications.getNotifications();
        notifications.map(function(notice) {
            if (notice.options.userlitelink) notice.dismiss();
        });
    },

    ready: false,

    versionsPanel: null,
    versionManager: null,

    connected: function() {
        this.ready = true;

        // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        this.subscriptions = new CompositeDisposable();

        // Subscribe to file changes
        this.subscriptions.add(
            atom.project.onDidChangePaths(connect.ini.bind(connect))
        );

        var root = document.createElement('div');
        var elemId = 'react-versions-panel';

        root.id = elemId;

        this.versionsPanel = atom.workspace.addRightPanel({
            item: root
        });
        // Hide the versions panel initially
        // this.versionsPanel.hide();

        this.versionManager = new VersionManager({
            socket: this.traffic.socket,
            elemId
        });
    },

    disconnected: function() {
        log('life_cycle', ['Its over!']);

        // Set the status bar state
        process.nextTick(() => {
            state.set({ type: 'disconnected' });
        });

        // Set ready to false
        this.ready = false;

        // Clear subscriptions
        if (this.subscriptions) this.subscriptions.dispose();

        // Destory any existing version manager
        if (this.versionManager) this.versionManager.close();
        this.versionManager = null;

        // Destroy any existing version panel
        if (this.versionsPanel) this.versionsPanel.destroy();
        this.versionsPanel = null;
    },

    kickStart: function() {
        // Clear out all subscriptions and then recreate
        this.disconnected(true);

        if (!connect.ini()) return;

        this.traffic = connect.traffic;
        this.traffic.socket.on(
            'disconnect',
            this.disconnected.bind(this, true)
        );
        this.traffic.socket.on('connect', this.connected.bind(this));
    },

    activate(initialState) {
        this.kickStart();

        // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        this.commandSubscriptions = new CompositeDisposable();

        // Register command that toggles this view
        this.commandSubscriptions.add(
            atom.commands.add('atom-workspace', {
                'userlite-link:connect': () => {
                    this.kickStart();
                },

                'userlite-link:clean': () => {
                    ut.cleanBuffer();
                },

                'userlite-link:save-with-intent': () => {
                    if (this.ready) intentOb.toggle();
                },

                'userlite-link:download-current': () => {
                    if (!this.ready)
                        return log('traffic', [
                            'Not ready!',
                            'download-current'
                        ]);
                    var editor = atom.workspace.getActiveTextEditor();
                    if (editor) this.traffic.downloadPath(editor.getPath());
                },

                'core:cancel': () => {
                    this.dismissNotifications();

                    if (!this.ready) return;

                    if (this.versionsPanel) this.versionsPanel.hide();

                    // intentOb.cancel();
                    this.traffic.closeErrorTrace();
                },

                'userlite-link:send-current-to-dev': event => {
                    if (!this.ready) return;

                    var devId = event.target.getAttribute('data-devid');

                    if (devId == config.getItem('userId')) return;

                    var editor = atom.workspace.getActiveTextEditor();
                    if (!editor) return false;

                    var filePath = editor
                        .getPath()
                        .substr(config.getItem('linkedProjectRoot').length);

                    this.traffic.send({
                        type: 'task',
                        task: 'send-open-file',
                        data: {
                            path: filePath,
                            sendTo: devId
                        }
                    });
                },

                'userlite-link:toggle-error-console': () => {
                    if (!this.ready) return;

                    return this.traffic.toggleErrorTrace();
                },

                'userlite-link:toggle-file-versions': () => {
                    if (!this.ready) {
                        log('start', ['Not ready - file-versions.']);
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
                    if (!this.ready) return console.log('not ready');

                    var downloadDirs = Array.from(
                        document.querySelectorAll('.tree-view .selected')
                    ).map(item => {
                        if (item.getPath) return item.getPath();
                        return '';
                    });

                    downloadDirs.map(dirPath => {
                        console.log('dirPath', dirPath);
                        this.traffic.downloadPath(dirPath);
                    });
                },

                'userlite-link:upload-selected': () => {
                    if (!this.ready) return;

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
                    if (this.ready) connect.end();
                    this.ready = false;
                }
            })
        );
    },

    deactivate() {
        this.disconnected();
        this.commandSubscriptions.dispose();

        if (this.ready) connect.end();
    }
};
