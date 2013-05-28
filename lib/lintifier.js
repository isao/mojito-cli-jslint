/*
 * Copyright (c) 2011-2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
'use strict';

var fs = require('fs'),
    log = require('./log'),
    jslint = require('jslint/lib/linter').lint,
    Scan = require('scanfs'),

    jscount,
    pending,
    errors,
    callback;


function onerr(err, pathname) {
    if ('ENOENT' === err.code) {
        callback('Invalid source: ' + pathname);
    } else {
        callback(err);
    }
}

function ondone(err) {
    pending--;
    if (!pending) {
        if (Object.keys(errors).length) {
            log.warn(errors);
        }
        callback(err, 'Done');
    }
}

function onignored(err, pathname) {
    log.debug('ignored', pathname);
}

function tally(pathname, offenses) {
    log.error('✖ %d error%s in %s', offenses.length, offenses.length > 1 ? 's' : '', pathname);
    offenses.forEach(function(o) {
        if (!errors[pathname]) {
            errors[pathname] = [];
        }
        errors[pathname].push({
            line: o.line, col: o.character, msg: o.reason, evidence: o.evidence
        });
    });
}

function lint(err, pathname) {
    pending++;
    jscount++;

    function onread(err, contents) {
        var results;
        if (!err) {
            results = jslint(contents);
            if (!results.ok) {
                tally(pathname, results.errors);
            }
        }
        ondone(err);
    }

    fs.readFile(pathname, {encoding: 'utf8'}, onread);
}

function isJs(err, pathname, stat) {
    if (stat.isFile() && ('.js' === pathname.slice(-3))) {
        return '.js';
    }
}

function scan(sources, exclude, cb) {
    var scan = new Scan(exclude, isJs);

    // up-scope state
    callback = cb || log.info;
    errors = {};
    pending = 1;
    jscount = 0;

    scan.on('.js', lint);
    scan.on('ignored', onignored);
    scan.on('error', onerr);
    scan.on('done', ondone);
    scan.relatively(sources);
}

module.exports = scan;
