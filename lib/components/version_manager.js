const VersionsComponent = require('./versions');
const React = require('react-for-atom').React;
const ReactDOM = require('react-for-atom').ReactDOM;
const config = require('../config');
const CompositeDisposable = require('atom').CompositeDisposable;
const log = require('../helpers/log');

function VersionManager(options) {
    this.socket = options.socket;
    this.socket.on('versions_update', updates => {
        updates.paths.map(itemPath => {
            log('versions', ['Version update for: ', itemPath]);
            this.currentItemData.stamp = new Date().getTime();
            this.setData(itemPath, updates.versions);
        });
    });

    this.rootPath = config.getItem('linkedProjectRoot');

    this.versions = {};

    this.id = options.elemId;
    this.root = document.getElementById(this.id);
    this.update();

    this.subscriptions = new CompositeDisposable();

    // Watch for updates needed in the versions pane
    this.subscriptions.add(
        atom.workspace.onDidStopChangingActivePaneItem(this.update.bind(this))
    );
}

VersionManager.prototype.close = function() {
    ReactDOM.unmountComponentAtNode(this.root);
    this.subscriptions.dispose();
};

VersionManager.prototype.pathKey = function(itemPath) {
    return itemPath.replace(/\/|\\|\./g, '_');
};

VersionManager.prototype.update = function(item) {
    if (!item) item = atom.workspace.getActiveTextEditor();
    this.currentItemData = this.getData(item);
    this.render(this.currentItemData);
};

VersionManager.prototype.getData = function(item) {
    var response = {
        path: '',
        loading: false,
        versions: []
    };

    if (typeof item !== 'object') return response;
    if (item.constructor.name !== 'TextEditor') return response;

    var itemPath = item.getPath().substr(this.rootPath.length);

    if (itemPath.indexOf('__') == 0) return response;
    response.path = itemPath;

    var pathKey = this.pathKey(itemPath);

    if (!this.versions[pathKey]) {
        this.queryVersionData(response.path);
        response.loading = true;
        return response;
    }

    response.versions = this.versions[pathKey];
    return response;
};

VersionManager.prototype.setData = function(filePath, versions) {
    var versionKey = this.pathKey(filePath);
    this.versions[versionKey] = versions;

    // Run an update/render if the data we recieved is for the
    // currently active editor
    if (this.pathKey(this.currentItemData.path) === versionKey) {
        this.update();
    }
};

VersionManager.prototype.queryVersionData = function(itemPath) {
    this.socket.send(
        {
            type: 'task',
            task: 'get-versions',
            data: {
                path: itemPath
            }
        },
        res => {
            if (!res.success)
                return console.warn('Unsucessful version request', res);

            this.setData(itemPath, res.versions);
        }
    );
};

VersionManager.prototype.render = function(itemData) {
    // Include the socket for sending reverts
    itemData.socket = this.socket;
    ReactDOM.render(
        React.createElement(VersionsComponent, itemData),
        this.root
    );
};

module.exports = VersionManager;
