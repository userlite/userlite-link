const items = atom.config.get('userlite-link') || {};

var valid = true;

function missingOptions() {
    valid = false;
    atom.notifications.addWarning(
        `Missing required ${atom.inDevMode() ? '**dev**' : '**live**'} configuration options.`,
        {
            description: `Open settings for the userlite-link package and add your configuration information.`,
            dismissable: true,
            icon: 'question',
            userlitelink: true
        }
    );
}

// Setup the connect to URL
if (atom.inDevMode()) {
    if (!items.connectToDev || !items.connectToDevPort) {
        missingOptions();
    } else {
        items.connectToUrl = 'ws://'.concat(
            items.connectToDev,
            ':',
            items.connectToDevPort
        );
    }
} else {
    if (!items.connectTo || !items.connectToPort) {
        missingOptions();
    } else {
        // SSL on live
        items.connectToUrl = 'wss://'.concat(
            items.connectTo,
            ':',
            items.connectToPort
        );
    }
}

if (valid) {
    var index = items.linkedProjectRoot.lastIndexOf('/') + 1;
    if (index !== items.linkedProjectRoot.length) {
        items.linkedProjectRoot = items.linkedProjectRoot + '/';
    }
    items.linkedProjectRootWithoutSlash = items.linkedProjectRoot.slice(0, -1);

    items.packageVersion = '0.0.1';
    var packageOb = atom.packages.getLoadedPackage('userlite-link');
    if (packageOb) items.packageVersion = packageOb.metadata.version;
}

module.exports = {
    getItem: function(key) {
        if (items[key]) {
            return items[key];
        }

        return false;
    }
};
