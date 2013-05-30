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
    log.debug(err);
    if ('ENOENT' === err.code) {
        callback(pathname + ' does not exist.');
    } else {
        callback('Unexpected error.');
    }
}

// check if both scanfs and async-readFile have finished
function doneYet(err, pathname) {
    var errout,
        msgout;

    // fs.readFile error
    if (err) {
        log.error('Unexpected problem reading', pathname);
        log.error(err);
        errors[pathname] = {line: '', col: '', msg: err.message, evidence: ''};
    }

    pending -= 1;
    if (!pending) {
        errout = Object.keys(errors).length ? errors : null;
        msgout = 'Done. No lint found in ' + jscount + ' js files.';
        callback(errout, msgout);
    }
}

function onignored(err, pathname) {
    log.debug('ignored', pathname);
}

// save array of lint error(s) in object keyed by filename
function tally(pathname, offenses) {
    var count = offenses.length,
        plural = count > 1 ? 's' : '';

    function perOffense(o) {
        if (!errors[pathname]) {
            errors[pathname] = [];
        }

        if (o) {
            errors[pathname].push({
                line: o.line,
                col: o.character,
                msg: o.reason,
                evidence: o.evidence || ''
            });
        }
    }

    log.error('%d error%s in %s', count, plural, pathname);
    offenses.forEach(perOffense);
}

function lint(err, pathname) {
    pending += 1;
    jscount += 1;

    function onread(err, contents) {
        var results;
        if (!err) {
            /*jslint regexp:true */
            results = jslint(contents.replace(/^#!.+$/, ''), lintopts);
            if (results.ok) {
                log.debug('✔ %s', pathname);
            } else {
                tally(pathname, results.errors);
            }
        }
        doneYet(err, pathname);
    }

    // encoding as a string param for realier versions of node
    fs.readFile(pathname, 'utf8', onread);
}

function isJs(err, pathname, stat) {
    if (stat.isFile() && ('.js' === pathname.slice(-3))) {
        return '.js';
    }
}

function main(sources, exclude, cb) {
    var scan = new Scan(exclude, isJs);

    // up-scope state
    callback = cb;
    errors = {};
    pending = 1; // count of scanfs and fs.readFile calls in progress
    jscount = 0; // count of .js files seen

    scan.on('.js', lint);
    scan.on('ignored', onignored);
    scan.on('error', onerr);
    scan.on('done', doneYet);
    scan.relatively(sources);
}

module.exports = main;
