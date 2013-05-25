/*
 * Copyright (c) 2011-2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
'use strict';

var fs = require('fs'),
    resolve = require('path').resolve,
    Scan = require('scanfs'),

    jslint = require('jslint/lib/linter').lint,
    config = require('./config'),
    log = require('./lib/log'),
    usage,

    // state
    pending,
    errors,
    callback;


function onerr(err) {
    log.error('uh oh.', err);
}

function ondone(err, count) {
    pending--;
    if (!pending) {
        if (errors.length) {
            log.warn(errors);
        }
    	callback(err, 'Done');
    }
}

function tally(pathname, offenses) {
    offenses.forEach(function(o) {
        errors.push({
            file: pathname,
            line: o.line,
            col: o.character,
            reason: o.reason,
            evidence: o.evidence
        });
    });
}

function lint(err, pathname) {
    pending++;
    fs.readFile(pathname, function onread(err, data) {
    	var results;
    	if (!err) {
            results = jslint(data.toString());
            log.debug(results.ok ? '✔' : '✖', pathname);
            if (!results.ok) {
                log.warn('✖ %d error%s in %s', results.errors.length, results.errors.length > 1 ? 's' : '', pathname);
                tally(pathname, results.errors);
            }    	
    	}
        ondone(err);        
    });
}

function isJs(err, pathname, stat) {
    if (stat.isFile() && ('.js' === pathname.slice(-3))) {
        return 'js';
    }
}

function exec(sources, env, cb) {
    var scan = new Scan(env.opts.exclude, isJs);

    // up-scope state
    callback = cb || log.info;
    errors = [];
    pending = 1;

    scan.on('js', lint);
    scan.on('error', onerr);
    scan.on('done', ondone);
    scan.relatively(sources);
}

function main(env, cb) {
    var exclude = config.exclude.always.concat(env.opts.exclude || []),
        type = env.args.shift() || '',
        sources = env.args.concat();

    if (env.opts.loglevel) {
        log.level = env.opts.loglevel;
    }

    // output dir
    if (!env.opts.directory) {
        env.opts.directory = resolve(env.cwd, 'artifacts/jslint');
    }

    //
    switch (type.toLowerCase()) {
    case 'app':
    case 'mojito':
        break;
    case 'mojit':
        // convert mojit to source path(s)
        break;
    default:
        sources.unshift(type || '.');
        type = 'app';
    }

    // directories to exclude
    env.opts.exclude = exclude.concat(config.exclude[type]);
        
    exec(sources, env, cb);
}


module.exports = main;

module.exports.usage = usage = [
    'Usage: mojito jslint [options] [type] [source]',
    '  type    "app", "mojit", or "mojito"',
    '  source  mojit name or path',
    '',
    'Options:',
    '  --directory          directory to save results. Default is artifacts/jslint',
    '  -d                   short for --directory',
    '  --exclude <pattern>  pattern of pathnames to exclude from linting',
    '  -e <pattern>         short for -e',
    '  --print              print results to stdout ',
    '  -p                   short for --print',
    '',
    'Examples:',
    '  Run jslint on the app in the current directory',
    '    mojito jslint app',
    '',
    '  Run jslint on mojits/Bar',
    '    mojito jslint mojit mojits/Bar',
    '    mojito jslint mojit Bar',
    '',
    '  Run jslint on the mojito framework',
    '    mojito jslint mojito'
].join('\n');

module.exports.options = [
    {shortName: 'd', hasValue: true, longName: 'directory'},
    {shortName: 'e', hasValue: [String, Array],  longName: 'exclude'},
    {shortName: 'p', hasValue: false, longName: 'print'}
];
