const ut = require('../helpers/ut');
const state = require('../state');

function Notices(traffic) {
    this.traffic = traffic;
}

Notices.prototype.fileReceived = function() {
    state.clearState('dot');
    state.clearState('download');
};

Notices.prototype.versionCreated = function() {
    versionsModel.reload();
};

Notices.prototype.versionSaved = function() {
    versionsModel.reload();
};

Notices.prototype.fileDownloaded = function() {
    state.clearState('download');
};

Notices.prototype.directoryTooLarge = function() {
    state.clearState('download');
    this.traffic.tasks.pullMissingDirs();
};

Notices.prototype.invalidPathMapping = function() {
    state.clearState('download');
    this.traffic.tasks.pullMissingDirs();
};

Notices.prototype.missingFileMapping = function() {
    state.clearState('dot');
    state.clearState('download');
};

Notices.prototype.pathDeleted = function() {
    state.clearState('delete');
};

module.exports = Notices;
