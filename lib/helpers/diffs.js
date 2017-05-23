const diff = require('diff');
const log = require('./log');

module.exports = {
    toHTML: function(diffOb, oldStr, newStr) {
        if (typeof diffOb === 'string') diffOb = JSON.parse(diffOb);
        if (!diffOb) return [];

        var response = diffOb.map(function(diff) {
            var oldLineStart = diff.lineStart;
            var newLineStart = diff.lineStart;

            if (diff.oldValue) {
                var lines = diff.oldValue.split('\n');
                lines.pop();

                var oldLines = lines.map(function(line) {
                    return {
                        line: oldLineStart++,
                        type: 'remove',
                        text: line,
                        spaces: (line.match(/^\s+/) || [''])[0].length
                    };
                });
            }

            if (diff.newValue) {
                var lines = diff.newValue.split('\n');
                // Remove possible empty line
                if (!lines[lines.length - 1]) lines.pop();

                var newLines = lines.map(function(line) {
                    return {
                        line: newLineStart++,
                        type: 'add',
                        text: line,
                        spaces: (line.match(/^\s+/) || [''])[0].length
                    };
                });
            }

            if (diff.oldValue && diff.newValue) {
                var response = [oldLines, newLines].reduce(function(a, b) {
                    return a.concat(b);
                });
                log('diffs', ['response', response]);
                return response;
            }

            if (diff.oldValue) return oldLines;
            if (diff.newValue) return newLines;
        });

        log('diffs', ['response', response]);
        return response;
    },

    getHTMLDiffs: function(oldStr, newStr) {
        return this.toHTML(this.getDiffs(oldStr, newStr), oldStr, newStr);
    },

    getDiffs: function(oldStr, newStr) {
        var diffs = diff.diffLines(oldStr, newStr);

        log('diffs', ['diffs.length', diffs.length]);
        log('diffs', ['diffs', diffs]);

        diffs = diffs.reduce(
            function(last, item) {
                if (last.removed && !item.added) {
                    last.diffs.push({
                        lineStart: last.row + 1,
                        lineEnd: last.row + 1,
                        oldValue: last.removed.value
                    });
                    last.removed = false;
                }

                if (item.removed) {
                    last.removed = item;
                } else if (item.added) {
                    last.diffs.push({
                        lineStart: last.row + 1,
                        lineEnd: last.row + item.count,
                        oldValue: last.removed.value,
                        newValue: item.value
                    });

                    // Reset the last added
                    last.removed = false;

                    // Increment the current
                    last.row += item.count;
                } else {
                    last.row += item.count;
                }

                return last;
            },
            {
                row: 0,
                diffs: [],
                removed: false
            }
        );

        // There may be one trailing removed node that still need to be processed
        if (diffs.removed) {
            var last = {
                row: 0
            };

            if (diffs.diffs.length) {
                var last = {
                    row: diffs.diffs[diffs.diffs.length - 1].row
                };
            }

            diffs.diffs.push({
                lineStart: last.row + 1,
                lineEnd: last.row + 1,
                oldValue: diffs.removed.value
            });
        }

        if (!diffs.diffs.length) return false;

        return diffs.diffs;
    }
};
