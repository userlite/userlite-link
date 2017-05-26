const config = require('../config');
const { React } = require('react-for-atom');
var uie = React.createElement;

const diffsView = require('./diffs_view');

function VersionsComponent(manager) {
    this.component = React.createClass({
        render: function() {
            if (!manager.state.path)
                return uie(
                    'div',
                    { className: 'versions' },
                    uie(tips.show(['activate_versions', 'toggle_versions']))
                );
            if (manager.state.loading) {
                return uie(Loading, { path: manager.state.path });
            }

            var text = 'Show All';
            var className = 'show-all';
            if (manager.state.showAll) {
                text = 'Collapse';
                className = 'show-all collapse';
            }

            var showAllButton = uie(
                'button',
                {
                    className,
                    onClick: e => {
                        e.stopPropagation();
                        manager.setState({
                            showAll: !manager.state.showAll
                        });
                    }
                },
                text
            );

            var dView = null;
            if (manager.state.showDiffs) {
                dView = uie(diffsView, {
                    diffs: manager.state.diffs,
                    loading: manager.state.loadingDiffs,
                    path: manager.state.path
                });
            }

            return uie(
                'div',
                { className: 'versions' },
                uie(
                    'div',
                    {
                        className: 'panel-heading padded'
                    },
                    uie(
                        'span',
                        { className: 'header-text' },
                        'File Versions: '
                    ),
                    uie(FilePath, { path: manager.state.path }),
                    showAllButton
                ),
                uie(VersionsList, {
                    versions: manager.versions,
                    showDiffs: manager.state.showDiffs
                }),
                // this.props.versions.length < 7
                //     ? uie(tips.show('toggle_versions'))
                //     : null
                dView
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
                    return uie(Tip, tip);
                });

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

            var rows = versions.map(version =>
                uie(VersionRow, {
                    version,
                    key: version.id
                })
            );

            var style = {};
            if (this.props.showDiffs) style.marginBottom = 420;

            return uie(
                'table',
                { className: 'table-condensed', style },
                uie('tbody', null, rows)
            );
        }
    });

    var VersionRow = React.createClass({
        getInitialState: function() {
            return {
                selected: false
            };
        },

        dblClickTimer: null,

        clicked: function(e) {
            e.stopPropagation();

            var version = this.props.version;
            var id = version.id;
            var state = manager.state.versions[id] || {};
            var cmd = e.metaKey;

            manager.clicked(id, cmd);

            if (this.dblClickTimer) {
                clearTimeout(this.dblClickTimer);
                this.dblClickTimer = null;
                manager.view(id);
            }

            this.dblClickTimer = setTimeout(() => {
                this.dblClickTimer = null;
            }, 300);
        },

        render: function() {
            var version = this.props.version;
            var id = version.id;
            var state = manager.state.versions[id] || {};

            state.selected = manager.state.selected.indexOf(id) >= 0;

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

            var style = {};
            if (state.selected) {
                style = { backgroundColor: '#2f353e' };
            }

            return uie(
                'tr',
                {
                    className: 'version-row',
                    onClick: this.clicked,
                    style
                },
                devIcon,
                textCell,
                uie(ActionsCell, {
                    version
                })
            );
        }
    });

    var ActionsCell = React.createClass({
        revert: function(e) {
            e.stopPropagation();

            manager.revert(this.props.version.id);
        },

        view: function(e) {
            e.stopPropagation();

            manager.view(this.props.version.id);
        },

        confirmRevert: function(e) {
            e.stopPropagation();

            manager.confirmRevert(this.props.version.id);
        },

        cancelRevert: function(e) {
            e.stopPropagation();

            manager.cancelRevert(this.props.version.id);
        },

        render: function() {
            var id = this.props.version.id;
            var state = manager.state.versions[id] || {};

            if (state.reverting) {
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

            if (state.confirmRevert) {
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
                        className: 'version-button comment',
                        key: 'comment',
                        onClick: e => {
                            e.stopPropagation();
                        }
                    },
                    'Comment'
                ),
                revertButton
            );
        }
    });
}

module.exports = VersionsComponent;