const config = require('../config');
const { React } = require('react-for-atom');
var uie = React.createElement;

module.exports = React.createClass({
    getInitialState: function() {
        return {
            showAll: true
        };
    },

    revert: function(id, cb) {
        this.props.socket.send(
            {
                type: 'task',
                task: 'revert-file-version',
                data: {
                    id,
                    path: this.props.path
                }
            },
            cb
        );
    },

    render: function() {
        if (!this.props.path)
            return uie(
                'div',
                { className: 'versions' },
                uie(tips.show(['activate_versions', 'toggle_versions']))
            );
        if (this.props.loading) {
            return uie(Loading, { path: this.props.path });
        }

        var text = 'Show All';
        var className = 'show-all';
        if (this.state.showAll) {
            text = 'Collapse';
            className = 'show-all collapse';
        }

        var showAllButton = uie(
            'button',
            {
                className,
                onClick: () => {
                    this.setState({
                        showAll: !this.state.showAll
                    });
                }
            },
            text
        );

        return uie(
            'div',
            { className: 'versions' },
            uie(
                'div',
                {
                    className: 'panel-heading padded'
                },
                uie('span', { className: 'header-text' }, 'File Versions: '),
                uie(FilePath, { path: this.props.path }),
                showAllButton
            ),
            uie(VersionsList, {
                versions: this.props.versions,
                cbs: {
                    revert: this.revert
                }
            })
            // this.props.versions.length < 7
            //     ? uie(tips.show('toggle_versions'))
            //     : null
        );
    }
});

const Tip = React.createClass({
    render: function() {
        return uie(
            'li',
            { className: 'message fade-in' },
            this.props.text,
            this.props.keystroke
                ? uie('p', { className: 'keystroke' }, this.props.keystroke)
                : null
        );
    }
});

var tips = {
    items: [
        {
            id: 'toggle_versions',
            text: 'Toggle Version View with',
            keystroke: '⌘ + Shift + V'
        },
        {
            id: 'activate_versions',
            text: 'Activate a tracked file to see versions.'
        }
    ],
    show: function(ids) {
        if (!Array.isArray(ids)) ids = [ids];

        var tips = this.items
            .filter(tip => {
                return ids.indexOf(tip.id) >= 0;
            })
            .map(tip => {
                tip.key = tip.id;
                console.log('tip', tip);
                return uie(Tip, tip);
            });

        console.log('tips', tips);

        if (!tips.length) return null;

        return this.render(tips);
    },

    render: function(tips) {
        return React.createClass({
            render: function() {
                return uie(
                    'background-tips',
                    { style: { top: 30 } },
                    uie(
                        'ul',
                        { className: 'vertical-center background-message' },
                        tips
                    )
                );
            }
        });
    }
    // getLi: function(id) {
    //     var tipOb = this.items.find(tip => {
    //         return tip.id === id;
    //     });
    //
    //     if (!tipOb) return null;
    //
    //     return this.render(tipOb);
    // },
    // rand: function() {
    //     var tip = this.items[Math.floor(Math.random() * this.items.length)];
    //     return this.render(this.li(tip));
    // },
};

var Loading = React.createClass({
    render: function() {
        return uie(
            'div',
            { className: 'versions' },
            uie(
                'div',
                {
                    className: 'preview-spinner',
                    style: {
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%'
                    }
                },
                uie('span', {
                    className: 'loading loading-spinner-small inline-block',
                    style: { margin: '10px 0' }
                }),
                uie(
                    'p',
                    { className: 'text-highlight preview-text-highlight' },
                    `Loading versions for:`
                ),
                uie('p', { className: 'text-success' }, this.props.path)
            )
        );
    }
});

var FilePath = React.createClass({
    render: function() {
        return uie('span', { className: 'text-success' }, this.props.path);
    }
});

var VersionsList = React.createClass({
    render: function() {
        var versions = this.props.versions;

        if (!versions.length) {
            return uie(
                'div',
                { className: 'versions-container' },
                uie('p', { style: { padding: 10 } }, 'No versions found.')
            );
        }

        // console.log(JSON.stringify(versions, null, 4));

        var rows = versions.map(version =>
            uie(VersionRow, {
                version,
                key: version.id,
                cbs: {
                    revert: this.props.cbs.revert
                }
            })
        );

        return uie(
            'table',
            { className: 'table-condensed' },
            uie('tbody', null, rows)
        );
    }
});

var VersionRow = React.createClass({
    render: function() {
        var version = this.props.version;

        var devIcon = uie(
            'td',
            { className: 'dev-profile-id' },
            uie('span', {
                className: 'dev-profile-icon',
                style: {
                    backgroundImage: `url('${version.dev.image}')`
                }
            })
        );

        var textCell = uie(
            'td',
            { className: 'version-created' },
            uie(
                'span',
                {
                    className: 'version-text-created'
                },
                version.since.display
            ),
            uie(
                'span',
                {
                    className: 'version-text-size'
                },
                version.size
            )
        );

        return uie(
            'tr',
            {
                className: 'version-row'
            },
            devIcon,
            textCell,
            uie(ActionsCell, {
                version,
                cbs: {
                    revert: this.props.cbs.revert
                }
            })
        );
    }
});

var ActionsCell = React.createClass({
    getInitialState: function() {
        return {
            revertConfirm: false
        };
    },

    confirmRevert: function() {
        this.setState({
            revertConfirm: true
        });
    },

    cancelRevert: function() {
        this.setState({
            revertConfirm: false
        });
    },

    revert: function() {
        this.setState({
            reverting: true
        });
        this.props.cbs.revert(this.props.version.id, () => {
            this.setState({
                reverting: false,
                revertConfirm: false
            });
        });
    },

    render: function() {
        if (this.state.reverting) {
            return uie(
                'td',
                null,
                uie(
                    'button',
                    {
                        className: 'version-button revert confirm',
                        key: 'revert'
                    },
                    'Reverting...'
                )
            );
        }

        if (this.state.revertConfirm) {
            var revertButton = uie(
                'button',
                {
                    className: 'version-button revert confirm',
                    onClick: this.revert,
                    key: 'revert'
                },
                'Really Revert?'
            );

            return uie(
                'td',
                null,
                uie(
                    'button',
                    {
                        className: 'version-button',
                        onClick: this.cancelRevert,
                        key: 'revert_cancel'
                    },
                    'Cancel'
                ),
                revertButton
            );
        }

        var revertButton = uie(
            'button',
            {
                className: 'version-button revert',
                onClick: this.confirmRevert,
                key: 'revert'
            },
            'Revert'
        );

        return uie(
            'td',
            null,
            uie(
                'button',
                {
                    className: 'version-button view',
                    key: 'view'
                },
                'View'
            ),
            uie(
                'button',
                {
                    className: 'version-button comment',
                    key: 'comment'
                },
                'Comment'
            ),
            revertButton
        );
    }
});
