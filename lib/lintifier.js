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

    lintopts = require('../config').lintopts,
    jscount,
    pending,
    errors,
    callback;


// scanfs error callback
function onerr(err, pathname) {
    if ('ENOENT' === err.code) {
        callback('Invalid source: ' + pathname);
    } else {
        callback(err);
    }
}

// check if both scanfs and async-readFile have finished
function doneYet(err) {
    var errout,
        msgout;

    pending--;
    if (!pending) {
        errout = Object.keys(errors).length && errors;
        msgout = 'Done. No lint found in ' + jscount + ' js files.';
        callback(errout, msgout);
    }
}

function onignored(err, pathname) {
    log.debug('ignored', pathname);
}

function tally(pathname, offenses) {
    var plural = offenses.length > 1 ? 's' : '';

    log.error('✖ %d error%s in %s', offenses.length, plural, pathname);
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

        if (err) {
            // fs.readFile error
            log.error(err);

        } else {
            // linting results
            results = jslint(contents, lintopts);
            if (results.ok) {
            	log.debug('✔ %s', pathname);
            } else {
                tally(pathname, results.errors);
            }
        }
        doneYet(err);
    }

    fs.readFile(pathname, {encoding: 'utf8'}, onread);
}

function isJs(err, pathname, stat) {
    if (stat.isFile() && ('.js' === pathname.slice(-3))) {
        return '.js';
    }
}

function main(sources, exclude, cb) {
    var scan = new Scan(exclude, isJs);

    // up-scope state
    callback = cb || log.info;
    errors = {};
    pending = 1;
    jscount = 0;

    scan.on('.js', lint);
    scan.on('ignored', onignored);
    scan.on('error', onerr);
    scan.on('done', doneYet);
    scan.relatively(sources);
}

module.exports = main;
