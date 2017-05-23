'use babel';

import UserliteLinkView from './userlite-link-view';
const connect = require('./connect');
const state = require('./state');
const config = require('./config');
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
        connectToPort: {
            type: 'integer',
            description: 'Live server port.',
            order: 5,
            default: 0
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

    activate(initialState) {
        // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        this.subscriptions = new CompositeDisposable();

        // Subscribe to file changes
        this.subscriptions.add(
            atom.workspace.observeTextEditors(connect.observeEditors)
        );

        // Subscribe to file changes
        this.subscriptions.add(atom.project.onDidChangePaths(connect.ini));

        var services = connect.ini();
        if (services) this.traffic = services.traffic;

        // Register command that toggles this view
        this.subscriptions.add(
            atom.commands.add('atom-workspace', {
                'userlite-link:connect': () => {
                    connect.ini();
                },

                'userlite-link:clean': () => {
                    ut.cleanBuffer();
                },

                'userlite-link:save-with-intent': () => {
                    intentOb.toggle();
                },

                'userlite-link:download-current': () => {
                    var editor = atom.workspace.getActiveTextEditor();
                    if (editor) this.traffic.downloadPath(editor.getPath());
                },

                'core:cancel': () => {
                    this.dismissNotifications();

                    // intentOb.cancel();
                    this.traffic.closeErrorTrace();
                    // versionsModel.closeView();
                },

                'userlite-link:send-current-to-dev': event => {
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
                    return this.traffic.toggleErrorTrace();
                },

                'userlite-link:toggle-file-versions': () => {
                    return versionsModel.toggleVersionPanel();
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

                'userlite-link:get-versions': event => {
                    var filepath = event.target.path
                        ? event.target.path
                        : event.target.getPath();
                    versionsModel.loadVersionPanel(
                        filepath.substr(
                            config.getItem('linkedProjectRoot').length
                        )
                    );
                },

                'userlite-link:download-selected': () => {
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
                    var uploadDirs = Array.from(
                        document.querySelectorAll('.tree-view .selected')
                    ).map(item => {
                        console.log(item);
                        if (item.getPath) return item.getPath();
                        return '';
                    });

                    if (!uploadDirs)
                        return atom.notifications.addWarning(
                            'No directories available.'
                        );

                    uploadDirs.map(dirPath => {
                        dir.files(dirPath, (err, files) => {
                            if (err) throw err;
                            files.map(file => {
                                this.traffic.sendFile(file);
                            });
                        });
                    });
                },

                'userlite-link:open-from-clipboard': event => {
                    return navigation.autoNav(event);
                },

                'userlite-link:disconnect': () => {
                    connect.end();
                }
            })
        );
    },

    deactivate() {
        connect.end();
        this.subscriptions.dispose();
    }
};
