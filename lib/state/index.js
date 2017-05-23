const stateClasses = {
    upload: 'inline-block',
    download: 'icon icon-cloud-download inline-block',
    connected: 'icon icon-zap inline-block',
    delete: 'icon icon-trashcan inline-block',
    disconnected: 'icon icon-zap inline-block',
    warning: 'icon icon-alert inline-block'
};

function State() {
    this.devProfiles = {};
    this.tileItems = {};
    this.priorities = {
        devProfiles: 500,
        connected: 501,
        disconnected: 501
    };
}

const itemsConfig = {};

State.prototype.set = function(options) {
    // Clear state when needed
    if (['connected', 'disconnected'].indexOf(options.type) >= 0) {
        this.clearState();
    }

    var parent = document.createElement('div');
    parent.className = 'ullink-state-element ' + options.type + ' inline-block';

    if (typeof stateClasses[options.type] !== 'string') {
        console.log(options.type);
        throw new Error('Invalid stateClasses.');
    }

    parent.className = [parent.className, stateClasses[options.type]].join(' ');
    parent.title = options.message || '';

    var priority = this.priorities[options.type] || 1000;

    var tile = this.statusBar.addRightTile({
        item: parent,
        priority: priority
    });

    var id = options.type;
    if (options.id) {
        id = options.type.concat('_', options.id);
    }

    this.tileItems[id] = {
        tile: tile,
        message: options.message || ''
    };
};

State.prototype.done = function(options) {
    var id = options.type;
    if (options.id) {
        id = options.type.concat('_', options.id);
    }

    if (this.tileItems[id]) {
        this.tileItems[id].tile.destroy();
        delete this.tileItems[id];
    }
};

State.prototype.addStateElement = function(type, node) {
    var parent = document.createElement('div');

    parent.className = 'ullink-state-element ' + type + ' inline-block';
    parent.appendChild(node);

    var priority = this.priorities[type] || 1000;

    tile = this.statusBar.addRightTile({
        item: parent,
        priority: priority
    });
};

State.prototype.getStatusTile = function(type) {
    var tiles = this.statusBar.getRightTiles();

    return tiles.find(tile => {
        var classes = (tile.getItem().className || '').split(' ');
        if (classes.indexOf('ullink-state-element') < 0) return false;
        if (classes.indexOf(type) < 0) return false;
        return true;
    });
};

State.prototype.clearState = function(type) {
    if (typeof type === 'undefined') {
        var className, tiles = this.statusBar.getRightTiles();

        var destroyTiles = tiles
            .map(function(tile) {
                className = (tile.getItem().className || '').split(' ');
                if (className.indexOf('ullink-state-element') >= 0) return tile;
            })
            .filter(function(tile) {
                return tile;
            });

        // Tiles need to be destroyed separately from selecting them
        // because it affects the tiles array
        destroyTiles.map(function(tile) {
            tile.destroy();
        });
    } else {
        var tile = this.getStatusTile(type);
        if (tile) tile.destroy();
    }
};

State.prototype.getProfile = function(devId) {
    return this.devProfiles.find(prof => prof.id == devId);
};

State.prototype.devProfileHTML = function(devId) {
    var profile = this.getProfile(devId);

    if (!profile) return false;

    var span = document.createElement('span');
    span.setAttribute('data-devid', profile.id);
    span.className = 'dev-profile-icon inline-block';
    span.style.backgroundImage = "url('" + profile.image + "')";

    if (profile.connected) span.className += ' connected';
    if (!profile.connected) span.className += ' disconnected';

    return span;
};

State.prototype.showDevs = function(profiles, cbs) {
    if (typeof profiles !== 'object') return;

    this.devProfiles = profiles;

    this.clearState('devProfiles');

    var devProfilesElement = document.createElement('div');
    devProfilesElement.className = 'ullink-state-devs inline-block';

    if (!this.devProfiles) return false;

    Object.keys(this.devProfiles).map(index => {
        var devOb = this.devProfiles[index];
        devProfilesElement.appendChild(this.devProfileHTML(devOb.id));
    });

    this.addStateElement('devProfiles', devProfilesElement);

    // Add event listeners for connected devs
    Object.keys(this.devProfiles).map(key => {
        var profile = this.devProfiles[key];

        if (profile.connected) {
            var elem = document.querySelector(
                '.ullink-state-devs .dev-profile-icon[data-devid="' +
                    profile.id +
                    '"'
            );
            if (!elem) return;

            elem.addEventListener('dblclick', event => {
                var devId = event.currentTarget.getAttribute('data-devid');
                cbs.sendCurrentToDev(devId);
            });
        }
    });
};

State.prototype.allDevActivity = function() {
    this.devProfiles.forEach(profile => {
        this.devActivity(profile.id);
    });
};

State.prototype.devActivity = function(devId) {
    var devElement = document.querySelector(
        '.ullink-state-devs .dev-profile-icon[data-devid="' + devId + '"'
    );
    if (!devElement) return false;

    var profile = this.getProfile(devId);

    // the nextRun concept stop multiple dev activities from running
    // concurrently
    var nextRun = (profile.nextRun || 0) - new Date().getTime();
    // console.log('nextRun', nextRun);

    if (nextRun < 0) nextRun = 0;

    profile.nextRun = new Date().getTime() + nextRun + 600;
    // console.log('profile.nextRun', profile.nextRun);

    setTimeout(function() {
        // Profile direction makes the dev turn in alternating directions
        // it's for fun
        if (profile.direction === undefined) profile.direction = '';

        if (profile.direction === '') {
            profile.direction = '-';
        } else {
            profile.direction = '';
        }

        devElement.style.borderRadius = '13px';
        devElement.style.transform = `rotate(${profile.direction}45deg)`;

        setTimeout(() => {
            devElement.style.borderRadius = '2px';
            devElement.style.transform = 'rotate(0deg)';
        }, 300);
    }, nextRun);
};

State.prototype.randomDevActivity = function(devId) {
    var devElement = document.querySelector(
        '.ullink-state-devs .dev-profile-icon[data-devid="' + devId + '"'
    );
    if (!devElement) return false;

    var actions = [
        {
            style: 'borderRadius',
            go: '13px',
            reset: '2px'
        },
        {
            style: 'transform',
            go: 'rotate(45deg)',
            reset: 'rotate(0deg)'
        },
        {
            style: 'transform',
            go: 'rotate(-45deg)',
            reset: 'rotate(0deg)'
        },
        {
            style: 'transform',
            go: 'scale(2,2)',
            reset: 'scale(1,1)'
        }
    ];

    var action = actions[Math.floor(Math.random() * actions.length)];
    devElement.style[action.style] = action.go;

    setTimeout(() => {
        devElement.style[action.style] = action.reset;
    }, 300);
};

module.exports = new State();
