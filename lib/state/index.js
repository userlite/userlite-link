const stateClasses = {
    upload: 'inline-block',
    download: 'icon icon-cloud-download inline-block',
    connected: 'icon icon-zap inline-block',
    delete: 'icon icon-trashcan inline-block',
    disconnected: 'icon icon-zap inline-block',
    warning: 'icon icon-alert inline-block'
};

function State() {
    this.devProfiles = [];
    this.tileItems = {};
    this.priorities = {
        devProfiles: 400,
        connected: 401,
        disconnected: 401
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

    parent.className = [parent.className, stateClasses[options.type]].join(' ');
    parent.title = options.message || '';

    var priority = this.priorities[options.type] || 410;

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
    // console.log(options);

    if (this.tileItems[id]) {
        // console.log('got in');
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
        var className,
            tiles = this.statusBar.getRightTiles();

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
    span.className =
        'dev-profile-icon inline-block' + (profile.appman ? ' appman' : '');
    span.style.backgroundImage = "url('" + profile.image + "')";

    if (profile.connected) span.className += ' connected';
    if (!profile.connected) span.className += ' disconnected';

    return span;
};

State.prototype.showDevs = function(profiles) {
    if (typeof profiles !== 'object') return;

    this.devProfiles = profiles;

    this.clearState('devProfiles');

    var devProfilesElement = document.createElement('div');
    devProfilesElement.className = 'ullink-state-devs inline-block';

    this.devProfiles.map(prof => {
        var elem = this.devProfileHTML(prof.id);
        elem.addEventListener('click', event => {
            var res = atom.commands.dispatch(
                event.target,
                'userlite-link:send-current-to-dev'
            );
        });

        devProfilesElement.appendChild(elem);
    });

    this.addStateElement('devProfiles', devProfilesElement);

    // Just a little activity for fun
    this.allDevActivity();
};

State.prototype.allDevActivity = function() {
    this.devProfiles.forEach(prof => {
        this.devActivity(prof.id);
    });
};

State.prototype.devConfirm = function(devId) {
    var devElement = document.querySelector(
        '.ullink-state-devs .dev-profile-icon[data-devid="' + devId + '"'
    );
    if (!devElement) return false;

    devElement.style.height = '0px';

    setTimeout(() => {
        devElement.style.height = '';
    }, 300);
};

State.prototype.devFail = function(devId) {
    var devElement = document.querySelector(
        '.ullink-state-devs .dev-profile-icon[data-devid="' + devId + '"'
    );
    if (!devElement) return false;

    devElement.style.width = '0px';

    setTimeout(() => {
        devElement.style.width = '';
    }, 300);
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
    if (nextRun < 0) nextRun = 0;

    profile.nextRun = new Date().getTime() + nextRun + 600;

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
