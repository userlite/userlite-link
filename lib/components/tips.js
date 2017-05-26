const { React } = require('react-for-atom');
var uie = React.createElement;

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

module.exports = {
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
                    { className: 'background-tips' },
                    uie(
                        'ul',
                        { className: 'vertical-center background-message' },
                        tips
                    )
                );
            }
        });
    }
};
