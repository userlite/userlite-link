const VersionsView = require('./versions');
const React = require('react-for-atom').React;
const ReactDOM = require('react-for-atom').ReactDOM;
const log = require('../helpers/log');
const CompositeDisposable = require('atom').CompositeDisposable;
const ManagerActions = require('./manager_actions');

function VersionManager(options) {
    this.socket = options.socket;

    this.actions = new ManagerActions(this);
    this.versionOb = new VersionsView(this.actions);

    this.socket.on('versions_update', updates => {
        if (updates.path) {
            // log('versions', ['Version update for: ', updates.path]);
            this.actions.setData(updates.path, updates.versions);
        }
        if (updates.paths) {
            return updates.paths.map(itemPath => {
                // log('versions', ['Version update for: ', itemPath]);
                this.actions.setData(itemPath, updates.versions);
            });
        }
    });

    this.socket.on('version_comparisons', data => {
        // log('versions', ['Received diff comparisons:']);
        this.actions.setDiffs(data.diffGroups);
    });

    this.id = options.elemId;
    this.root = document.getElementById(this.id);
    this.actions.update();

    this.subscriptions = new CompositeDisposable();

    // Watch for updates needed in the versions pane
    this.subscriptions.add(
        atom.workspace.onDidStopChangingActivePaneItem(
            this.actions.changeEditor.bind(this.actions)
        )
    );
}

VersionManager.prototype.close = function() {
    ReactDOM.unmountComponentAtNode(this.root);
    this.subscriptions.dispose();
};

VersionManager.prototype.render = function() {
    ReactDOM.render(React.createElement(this.versionOb.component), this.root);
};

module.exports = VersionManager;
