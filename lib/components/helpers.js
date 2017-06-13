const { React } = require('react-for-atom');
var uie = React.createElement;

module.exports = {
    loading: React.createClass({
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
    })
};
