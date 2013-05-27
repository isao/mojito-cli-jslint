/*
 * Copyright (c) 2011-2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
'use strict';

var log = require('./log');

function main(env, cb) {


    // output dir
    if (!env.opts.directory) {
        env.opts.directory = resolve(env.cwd, 'artifacts/jslint');
    }

}

module.exports = main;
