/*
 * Copyright (c) 2011-2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
'use strict';

var path = require('path'),
    fs = require('fs'),
    fmt = require('util').format,
    EOL = require('os').EOL,

    mkdirp = require('mkdirp').sync,
    rimraf = require('rimraf').sync,
    log = require('./log');


function prepFile(dir, filename) {
    var opts = {encoding: 'utf8', flags: 'w'},
        pathname = path.join(dir, filename),
        stream;

    try {
        rimraf(dir);
        mkdirp(dir);
        stream = fs.createWriteStream(pathname, opts);
    } catch(err) {
        log.debug('prepFile() exception', err);
        return;
    }

    return stream;
}

// return a function that is responsible for outputing the lint results, to
// a file or stdout, and then invoking the final callback.
function main(env, cb) {
    var dir = env.opts.directory || path.resolve(env.cwd, 'artifacts/jslint'),
        out = env.opts.print ? process.stdout : prepFile(dir, 'jslint.txt');

    if (!out) {
        cb('Failed to initialize report.');
        return;
    }

    // invoked by lintifier.doneYet()
    function reporter(offenses, msg) {
        var files = offenses ? Object.keys(offenses) : [],
            count = 0,
            total = 0,
            plural,
            summary;

        function perline(o) {
            var evidence = o.evidence.trim();
            count++;
            total++;

            out.write(fmt('  %d %d,%d: %s%s', count, o.line, o.col, o.msg, EOL));
            if (evidence) {
                out.write(fmt('    %s%s', evidence, EOL));
            }
        }

        function perfile(pathname) {
            count = 0;
            out.write(pathname + EOL);
            offenses[pathname].forEach(perline);
            out.write(EOL);
        }

        function done() {
            // final callback is responsible for process.exit(code)
            cb('Done. ' + summary);
        }

        if (offenses) {
            // write to "out" stream
            Object.keys(offenses).forEach(perfile);
            plural = files.length > 1 ? 's' : '';
            summary = fmt('%d errors found in %d file%s', total, files.length, plural);

            if (!env.opts.print) {
                out.on('finish', done);
                out.on('end', done);
                out.end(summary + EOL);
            }

        } else {
            // no errors
            cb(null, msg);
        }
    }

    return reporter;
}

module.exports = main;
