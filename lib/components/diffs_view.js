const { React } = require('react-for-atom');
var uie = React.createElement;
const tips = require('./tips');

module.exports = React.createClass({
    render: function() {
        return uie(
            'div',
            { className: 'git-console' },
            uie(DiffsList, {
                diffs: this.props.diffs,
                path: this.props.path,
                loading: this.props.loading,
                active: this.props.active
            })
        );
    }
});

var DiffsList = React.createClass({
    render: function() {
        if (!this.props.active) {
            return uie(tips.show(['activate_versions', 'toggle_versions']));
        }

        if (this.props.loading) {
            return uie(Loading);
        }

        if (!this.props.diffs.length) {
            return uie('p', { style: { padding: 10 } }, 'No diffs found.');
        }

        var rows = [];

        var key = 1;

        this.props.diffs.forEach((diffsGroup, i) => {
            diffsGroup.forEach(diff => {
                key++;
                rows.push(
                    uie(DiffRow, {
                        diff: diff,
                        path: this.props.path,
                        key
                    })
                );
            });
            // Add spacer row but not on last diff
            if (i + 1 !== this.props.diffs.length) {
                key++;
                rows.push(uie('tr', { className: 'diff-group-break', key }));
            }
        });

        return uie('table', null, uie('tbody', null, rows));
    }
});

var Loading = React.createClass({
    render: function() {
        return uie(
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
                `Loading...`
            )
        );
    }
});

var DiffRow = React.createClass({
    render: function() {
        var diff = this.props.diff;

        return uie(
            'tr',
            {
                className: `diff-row ${diff.type}`,
                onClick: () => {
                    atom.workspace.open(this.props.path, {
                        initialLine: this.props.diff.line - 1
                    });
                }
            },
            uie('td', { className: 'diff-line-number' }, diff.line),
            uie(
                'td',
                {
                    className: 'diff-line-text native-key-bindings',
                    tabIndex: -1,
                    style: { paddingLeft: diff.spaces * 8 }
                },
                diff.text
            )
        );
    }
});
