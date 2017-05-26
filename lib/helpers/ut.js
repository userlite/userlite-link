const fs = require('fs');
const log = require('./log');

function Ut() {}

//function will check if a directory exists, and create it if it doesn't
Ut.prototype.checkCreateDirectory = function(dir, cb) {
    fs.stat(dir, function(err, stats) {
        //Check if error defined and the error code is "not exists"
        if (err && err.code === 'ENOENT') {
            //Create the directory, call the callback.
            return fs.mkdir(dir, cb);
        }

        // Forward error in case a different error was triggered
        cb(err);
    });
};
Ut.prototype.toCamelCase = function(string) {
    if (typeof string !== 'string') return '';

    return string.replace(/-([a-z])/g, function(g) {
        return g[1].toUpperCase();
    });
};

Ut.prototype.parseJson = function(jsonString) {
    try {
        var o = JSON.parse(jsonString);
        if (o && typeof o === 'object') {
            return o;
        }
    } catch (e) {}
    return false;
};

Ut.prototype.bufferize = function(detail, fileBuffer) {
    var metaBuf = Buffer.from(JSON.stringify(detail) + '----HEADERS_END----');
    var totalBufLength = metaBuf.length + fileBuffer.length;
    return Buffer.concat([metaBuf, fileBuffer], totalBufLength);
};

Ut.prototype.unbufferize = function(input) {
    if (!Buffer.isBuffer(input)) return input;

    var headIndex = input.indexOf('----HEADERS_END----');

    if (headIndex < 0) {
        log(
            'error',
            new Error('Buffer missing ----HEADERS_END---- in unbufferize.')
        );
        return false;
    }

    var detailJson = input.slice(0, headIndex).toString('utf8');
    detail = this.parseJson(detailJson);

    if (!detail) {
        log(
            'error',
            'Invalid json provided to unbufferize.',
            new Error('Invalid json provided to unbufferize.')
        );
        return false;
    }

    var fileBuffer = input.slice(headIndex + 19);
    detail.data.buffer = fileBuffer;
    // log('ut', ['Unbuferized!!!', detail]);
    return detail;
};

Ut.prototype.collapseTreeview = function() {
    // Collapse the treeview directories
    var mainFolders = document.querySelectorAll(
        '.directory.project-root.expanded>.header.list-item'
    );

    var altClick = document.createEvent('MouseEvents');
    altClick.initMouseEvent(
        'click',
        true,
        true,
        window,
        0,
        0,
        0,
        80,
        20,
        false,
        true,
        false,
        false,
        0,
        null
    );

    var normalClick = document.createEvent('MouseEvents');
    normalClick.initMouseEvent(
        'click',
        true,
        true,
        window,
        0,
        0,
        0,
        80,
        20,
        false,
        false,
        false,
        false,
        0,
        null
    );

    mainFolders = Array.from(mainFolders);

    mainFolders.map(function(folder) {
        folder.dispatchEvent(altClick);
        folder.dispatchEvent(normalClick);
    });
};
Ut.prototype.cleanBuffer = function(editor) {
    var replacements;

    if (typeof editor !== 'object' || typeof editor.getGrammar !== 'function') {
        editor = atom.workspace.getActiveTextEditor();
    }

    // Return if no editor found or grammar is not supported
    if (!editor) return false;
    if (editor.getGrammar().name !== 'PHP') return false;

    editor.buffer.transact(function() {
        // Manually modififying the buffer if it's not already
        // This prevents the default functionality of the buffer package
        // from saving the file after a replacement is made if the buffer
        // was previously unmodified
        var removeEnd = false;
        if (!editor.buffer.isModified()) {
            removeEnd = editor.buffer.append('\n');
        }

        // Replacements for legacy typos in the template_simple app
        editor.buffer.replace(/Udate\ DB/g, 'Update DB');
        editor.buffer.replace(/\}\s{2,}else \{/g, '} else {');

        // Remove white space at the end of the lines
        editor.buffer.replace(/[^\S\n]+\n{1}/g, '\n');

        // Remove multi-line breaks over 3 long
        editor.buffer.replace(/\n\n\n\n+/g, '\n\n\n');

        // Replace empty php tags
        editor.buffer.replace(/<\?php[\s\n]+\?>/g, '');

        // Add space after bracket before else statement
        editor.buffer.replace(/\}else/g, '} else');
        editor.buffer.replace(/else\{/g, 'else {');
        editor.buffer.replace(/elseif\{/g, 'elseif {');

        // Replace legacy [] syntax
        do {
            replacements = editor.buffer.replace(
                /\barray\(([^(]*?)\)/g,
                '[$1]'
            );
        } while (replacements);

        // Remove all the long comment strings that go beyond the 80 character block
        editor.buffer.backwardsScan(/\n(.*#{3,}[^\n,-]*)(-{3,})/g, function(
            iterator
        ) {
            var tabCount = 0;
            if (iterator.match[0].match(/\t/g)) {
                tabCount = iterator.match[0].match(/\t/g).length;
            }

            var addLength =
                tabCount * (atom.config.get('editor').tabLength - 1);

            var lenOne = iterator.match[1].length + addLength;
            var lenTwo = iterator.match[1].length + addLength;
            var fullLength = iterator.match[0].length + addLength;

            // If the first match group is greater than 80 then
            // remove any trailing dashes
            if (lenOne >= 80) {
                return iterator.replace('\n' + iterator.match[1]);
            } else if (fullLength < 82) {
                var missingLength = 82 - fullLength;
                var cDashes = Array(missingLength).join('-');

                return iterator.replace(iterator.match[0] + cDashes);
            } else if (fullLength > 80) {
                var fullCount = 80 - lenOne;
                var commentDashes = iterator.match[2].substr(0, fullCount);

                return iterator.replace(
                    '\n' + iterator.match[1] + commentDashes
                );
            }

            throw 'Missing handling for regex match';
        });

        if (removeEnd) editor.buffer.delete(removeEnd);
    });
};

module.exports = new Ut();
