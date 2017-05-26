const config = require('../config');
const extend = require('../helpers/extend');
const ut = require('../helpers/ut');

function ManagerActions(manager) {
    this.manager = manager;
    this.socket = this.manager.socket;

    // Data
    this.data = {};
    this.defaultState = {
        loading: false,
        path: '',
        versions: {},
        selected: [],
        diffs: [],
        showAll: true,
        showDiffs: false
    };

    this.querying = {};

    this.state = JSON.parse(JSON.stringify(this.defaultState));

    this.versions = [];
    this.cachedVersions = {};

    this.rootPath = config.getItem('linkedProjectRoot');
}

ManagerActions.prototype.setState = function(newState) {
    this.state = extend(this.state, newState);
    this.manager.render();
};

ManagerActions.prototype.changeEditor = function() {
    // Cache the current state data
    if (this.state.path) {
        var currentVersionKey = this.pathKey(this.state.path);
        if (!this.cachedVersions[currentVersionKey]) {
            this.cachedVersions[currentVersionKey] = {
                versions: [],
                state: {}
            };
        }
        this.cachedVersions[currentVersionKey].state = this.state;
    }

    var item = atom.workspace.getActiveTextEditor();
    var itemData = this.getData(item);
    var versionKey = this.pathKey(itemData.path);

    var cachedData = this.cachedVersions[versionKey] || {
        versions: [],
        state: {}
    };

    this.state = extend(this.defaultState, cachedData.state);
    this.update(item);
};

ManagerActions.prototype.update = function(item) {
    if (!item) item = atom.workspace.getActiveTextEditor();
    var itemData = this.getData(item);

    this.state.path = itemData.path;
    this.state.loading = itemData.loading;
    this.versions = itemData.versions;

    this.manager.render();
};

ManagerActions.prototype.pathKey = function(itemPath) {
    return itemPath.replace(/\/|\\|\./g, '_');
};

ManagerActions.prototype.getData = function(item) {
    var response = {
        path: '',
        loading: false,
        versions: []
    };

    if (typeof item !== 'object') return response;
    if (item.constructor.name !== 'TextEditor') return response;

    if (!item.getPath()) return response;
    var itemPath = item.getPath().substr(this.rootPath.length);

    if (itemPath.indexOf('__') == 0) return response;
    response.path = itemPath;

    var pathKey = this.pathKey(itemPath);

    if (!this.cachedVersions[pathKey]) {
        this.queryVersionData(response.path);
        response.loading = true;
        return response;
    }

    response.versions = this.cachedVersions[pathKey].versions;
    return response;
};

ManagerActions.prototype.setData = function(filePath, versions) {
    var versionKey = this.pathKey(filePath);
    this.cachedVersions[versionKey] = { versions, state: {} };

    // Run an update/render if the data we recieved is for the
    // currently active editor
    if (this.pathKey(this.state.path) === versionKey) {
        this.update();
    }
};

ManagerActions.prototype.queryVersionData = function(itemPath) {
    if (this.querying[this.pathKey(itemPath)]) return;

    // If we are already querying the data then don't query again
    this.querying[this.pathKey(itemPath)] = true;

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

// View actions
ManagerActions.prototype.confirmRevert = function(id) {
    this.state.versions[id] = this.state.versions[id] || {};
    this.state.versions[id].confirmRevert = true;
    this.manager.render();
};

ManagerActions.prototype.cancelRevert = function(id) {
    this.state.versions[id] = this.state.versions[id] || {};
    this.state.versions[id].confirmRevert = false;
    this.manager.render();
};

ManagerActions.prototype.clicked = function(id, cmd) {
    var state = this.state.versions[id] || {};

    var index = this.state.selected.indexOf(id);

    if (cmd) {
        if (index >= 0) {
            this.state.selected.splice(index, 1);
        } else {
            this.state.selected.push(id);
        }

        // If more than two are selected then remove the extra one
        if (this.state.selected.length > 2) {
            this.state.selected.shift();
        }
    } else {
        this.state.selected = [];
        if (index < 0) this.state.selected.push(id);
    }

    if (this.state.selected.length) {
        this.state.showDiffs = true;
    } else {
        this.state.showDiffs = false;
    }
    if (this.state.selected.length === 0) {
        this.state.diffs = [];
    }
    if (this.state.selected.length === 1) {
        var version = this.versions.find(version => version.id === id);
        this.state.diffs = ut.parseJson(version.diffs) || [];
    }
    if (this.state.selected.length === 2) {
        var version = this.versions.find(version => version.id === id);
        this.loadDiffs(this.state.selected);
    }

    this.state.versions[id] = state;

    this.manager.render();
};

ManagerActions.prototype.setDiffs = function(diffGroups) {
    this.state.loadingDiffs = false;
    this.state.diffs = diffGroups;
    this.manager.render();
};

ManagerActions.prototype.loadDiffs = function(versions) {
    // Sort version keys so the comparison is chronological
    versions.sort();

    // Loading diffs
    this.state.loadingDiffs = true;

    this.socket.send({
        type: 'task',
        task: 'versions-comparison',
        data: {
            path: this.state.path,
            versions
        }
    });
};

ManagerActions.prototype.view = function(id) {
    this.socket.send({
        type: 'task',
        task: 'get-file-version',
        data: {
            id,
            path: this.state.path
        }
    });
};

ManagerActions.prototype.revert = function(id) {
    this.socket.send(
        {
            type: 'task',
            task: 'revert-file-version',
            data: {
                id,
                path: this.state.path
            }
        },
        res => {
            if (res.success) {
                this.state.versions[id].confirmRevert = false;
                this.manager.render();
            } else {
                atom.notifications.addWarning(
                    'Unabled to revert version ' + id,
                    {
                        dismissable: true,
                        userlitelink: true
                    }
                );
            }
        }
    );
};

module.exports = ManagerActions;
