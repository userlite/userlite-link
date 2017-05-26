function Config() {
    this.valid = false;
    this.probs = ['Not initialized'];

    this.initialize();
}

Config.prototype.initialize = function() {
    this.valid = true;
    this.probs = [];

    this.items = atom.config.get('userlite-link') || {};

    // Setup the connect to URL
    if (atom.inDevMode()) {
        if (!this.items.connectToDev || !this.items.connectToDevPort) {
            this.valid = false;
            this.probs.push('Missing dev connection details.');
        } else {
            this.items.connectToUrl = 'ws://'.concat(
                this.items.connectToDev,
                ':',
                this.items.connectToDevPort
            );
        }
    } else {
        if (!this.items.connectTo) {
            this.valid = false;
            this.probs.push('Missing live connection details.');
        } else {
            // SSL on live
            this.items.connectToUrl = 'wss://'.concat(this.items.connectTo);
        }
    }

    if (!this.items.linkedProjectRoot) {
        this.valid = false;
        this.probs.push('Missing linked project root.');
    }

    if (!this.items.userId) {
        this.valid = false;
        this.probs.push('Missing user id.');
    }

    if (!this.items.userPassphrase) {
        this.valid = false;
        this.probs.push('Missing passphrase.');
    }

    if (!this.valid) return;

    var slashIndex = this.items.linkedProjectRoot.lastIndexOf('/') + 1;
    if (slashIndex !== this.items.linkedProjectRoot.length) {
        this.items.linkedProjectRoot = this.items.linkedProjectRoot + '/';
    }

    var woSlash = this.items.linkedProjectRoot.slice(0, -1);
    this.items.linkedProjectRootWithoutSlash = woSlash;

    this.items.packageVersion = '0.0.1';
    var packageOb = atom.packages.getLoadedPackage('userlite-link');
    if (packageOb) this.items.packageVersion = packageOb.metadata.version;
};

Config.prototype.getItem = function(key) {
    if (this.items[key]) return this.items[key];
    return false;
};

module.exports = new Config();
