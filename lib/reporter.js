/*
 * Copyright (c) 2011-2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
/*jslint stupid:true*/
'use strict';

// todo? sync, stream, <li> for html

var path = require('path'),
    fs = require('fs'),
    fmt = require('util').format,
    EOL = require('os').EOL,

    mkdirp = require('mkdirp').sync,
    rimraf = require('rimraf').sync,
    log = require('./log');


function writeHtmlFile(dir, str) {
    var pathname = path.join(dir, 'jslint.html');

    try {
        rimraf(dir);
        mkdirp(dir);
        fs.writeFileSync(pathname, str + EOL);
        log.info('Lint report saved to', path.relative(process.cwd(), pathname));
    } catch (err) {
        log.debug('Unable to save report.', err);
        return err;
    }
}

function getHtml(lines, summary) {
    return [
        '<html>',
        '<head>',
        '<title>JSLint Report</title>',
        '<body>',
        '<h1>JSLint Report</h1>',
        '<p>' + summary + '</p>',
        '<pre>'
    ].concat(lines, '</pre>', '</body>', '</html>').join(EOL);
}

function getSummary(errcount, filecount) {
    var fstr = 'Total of %d error%s found in %d file%s.',
        eplural = errcount > 1 ? 's' : '',
        fplural = filecount > 1 ? 's' : '';

    return fmt(fstr, errcount, eplural, filecount, fplural);
}

// return a function that is responsible for outputing the lint results, to
// a file or stdout, and then invoking the final callback.
function main(env, cb) {
    var dir = env.opts.directory || path.resolve(env.cwd, 'artifacts/jslint'),
        lines = [],
        count = 0,
        total = 0;

    function perOffense(o) {
        var evidence = o.evidence.trim();

        count += 1;
        total += 1;

        lines.push(fmt('  #%d %d,%d: %s', count, o.line, o.col, o.msg));
        if (evidence) {
            lines.push('     ' + evidence);
        }
    }

    // invoked by lintifier.doneYet()
    function reporter(offenses, msg) {
        var files = offenses ? Object.keys(offenses) : [],
            summary,
            writeErr;

        function perFile(pathname) {
            count = 0;
            lines.push(pathname);
            offenses[pathname].forEach(perOffense);
            lines.push(''); // blank line
        }

        if (offenses) {
            // accumulate report in lines array
            Object.keys(offenses).forEach(perFile);
            summary = getSummary(total, files.length);

            if (env.opts.print) {
                lines.unshift('JSLint Report', '');
                console.error(lines.join(EOL));
                cb(summary);

            } else {
                writeErr = writeHtmlFile(dir, 'jslint.html', getHtml(lines, summary));
            }

            // has errors
            cb(writeErr || summary);

        } else {
            // is lint free
            cb(null, msg);
        }
    }

    return reporter;
}

module.exports = main;
