const { React } = require('react-for-atom');
var uie = React.createElement;
const tips = require('./tips');
const helpers = require('./helpers');

function CBox(managerActions) {
    var CommentBox = React.createClass({
        getInitialState: function() {
            return {
                comment: this.props.comment,
                id: this.props.id
            };
        },

        updateComment: function(e) {
            this.setState({ comment: e.target.value });
        },

        render: function() {
            if (!this.props.active)
                return uie(tips.show(['view_diffs', 'toggle_versions']));
            if (this.props.loading) return uie(helpers.loading);

            return uie(
                'div',
                { className: 'class' },
                uie('textarea', {
                    value: this.state.comment,
                    onChange: this.updateComment
                }),
                uie(
                    'div',
                    null,
                    uie(
                        'button',
                        {
                            className: 'save',
                            onClick: managerActions.saveComment.bind(
                                managerActions,
                                {
                                    comment: this.state.comment,
                                    id: managerActions.comment.id,
                                    path: managerActions.state.path
                                }
                            )
                        },
                        'Save'
                    ),
                    uie(
                        'button',
                        {
                            className: 'cancel',
                            onClick: managerActions.cancelComment.bind(
                                managerActions
                            )
                        },
                        'Cancel'
                    )
                )
            );
        }
    });
    return React.createClass({
        render: function() {
            return uie(
                'div',
                { className: 'comment-box' },
                uie(CommentBox, {
                    id: this.props.id,
                    comment: this.props.comment,
                    active: this.props.active
                })
            );
        }
    });
}
module.exports = CBox;
