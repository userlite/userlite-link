function Config(items) {
    this.valid = true;
    this.items = items;

    // Setup the connect to URL
    if (atom.inDevMode()) {
        if (!this.items.connectToDev || !this.items.connectToDevPort) {
            this.valid = false;
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
        } else {
            // SSL on live
            this.items.connectToUrl = 'wss://'.concat(this.items.connectTo);
        }
    }

    if (!this.valid) return this;

    var slashIndex = this.items.linkedProjectRoot.lastIndexOf('/') + 1;
    if (slashIndex !== this.items.linkedProjectRoot.length) {
        this.items.linkedProjectRoot = this.items.linkedProjectRoot + '/';
    }

    var woSlash = this.items.linkedProjectRoot.slice(0, -1);
    this.items.linkedProjectRootWithoutSlash = woSlash;

    this.items.packageVersion = '0.0.1';
    var packageOb = atom.packages.getLoadedPackage('userlite-link');
    if (packageOb) this.items.packageVersion = packageOb.metadata.version;
    console.log('this.items.packageVersion', this.items.packageVersion);
}

Config.prototype.getItem = function(key) {
    if (this.items[key]) return this.items[key];
    return false;
};

// Initialize the config with the userlite-link config items
module.exports = new Config(atom.config.get('userlite-link') || {});
