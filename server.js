/**
 * @file tuber-time web server.
 * @version 2.0.0
 */

'use strict';

var easyrtc = require('open-easyrtc');
var express = require('express');
var fs = require('fs');
var Handlebars = require('handlebars');
var io = require('socket.io');
var nconf = require('nconf');

var webServer = null;

// Try to find configuring files in the following places (in order)
//   1. Command-line arguments
//   2. Environment variables
//   3. settings.json file
nconf.argv()
     .env()
     .file({ file: 'settings.json' });

// Web application setup (for setting up routes)
var tubertcApp = express();

// Load index.html template
var indexSource = fs.readFileSync(__dirname + '/templates/index.html', 'utf8');
var indexTmpl = Handlebars.compile(indexSource);

// Set up web servers according to configuration file

// By default, debugMode is on. Deployment requires the existence of a settings.json
// configuration file
var debugMode = nconf.get('debug');
if (debugMode === undefined) {
    debugMode = true;
}

// By default, if debugMode is enabled, AudioMeter is enabled.
var enableAudioMeter = nconf.get('enableAudioMeter');
if (enableAudioMeter === undefined) {
    if (debugMode) {
        enableAudioMeter = true;
    } else {
        enableAudioMeter = false;
    }
}

// Set up routes for static resources
tubertcApp.use('/js', express.static(__dirname + '/public/js'));
tubertcApp.use('/css', express.static(__dirname + '/public/css'));
tubertcApp.use('/audio', express.static(__dirname + '/public/audio'));
tubertcApp.use('/images', express.static(__dirname + '/public/images'));

// Add a route for telemetry scripts
if (debugMode) {
    tubertcApp.use('/telemetry', express.static(__dirname + '/public/telemetry'));
}

// Set up main index page (this changes depending on whether or not debugging is enabled in settings.json).
tubertcApp.get('/', function(req, res) {
    var pageTitle = 'tubertc';
    var extraScripts = '';

    // If debug mode is enabled, load our debugging script (and add [debug] in the title)
    if (debugMode) {
        pageTitle += ' [debug]';
        extraScripts = '<script type="text/javascript"  src="/telemetry/debug.js"></script>';
    }

    if (enableAudioMeter) {
        pageTitle += '+am';
        extraScripts += '<script type="text/javascript" src="/js/audiometer.js"></script>';
    }

    res.send(indexTmpl({
        title: pageTitle,
        debugBody: extraScripts
    }));
});

// By default the listening server port is 8080 unless set by nconf or Heroku
var serverPort = process.env.PORT || nconf.get('port') || 8080;

// By default, HTTP is used
var ssl = nconf.get('ssl');

if (ssl !== undefined && ssl.key !== undefined && ssl.cert !== undefined) {
    webServer = require('https').createServer(
        {
            key: fs.readFileSync(ssl.key),
            cert: fs.readFileSync(ssl.cert)
        },
        tubertcApp
    ).listen(serverPort);
} else {
    webServer = require('http')
        .createServer(tubertcApp)
        .listen(serverPort);
}

// Set log level according to debugMode, on production, log level is on error only
var ioOpts;
if (debugMode) {
    ioOpts = { 'log level': 3 };
} else {
    ioOpts = { 'log level': 0 };
}

var socketServer = io.listen(webServer, ioOpts);

// Set up easyrtc specific options
easyrtc.setOption('demosEnable', false);
easyrtc.setOption('updateCheckEnable', false);

// If debugMode is enabled, make sure logging is set to debug
if (debugMode) {
    easyrtc.setOption('logLevel', 'debug');
}

// Use appIceServers from settings.json if provided. The format should be the same
// as that used by easyrtc (http://easyrtc.com/docs/guides/easyrtc_server_configuration.php)
var iceServers = nconf.get('appIceServers');
if (iceServers !== undefined) {
    easyrtc.setOption('appIceServers', iceServers);
} else {
    easyrtc.setOption('appIceServers', [
        {
            url: 'stun:stun.l.google.com:19302'
        },
        {
            url: 'stun:stun.sipgate.net'
        },
        {
            url: 'stun:217.10.68.152'
        },
        {
            url: 'stun:stun.sipgate.net:10000'
        },
        {
            url: 'stun:217.10.68.152:10000'
        }
    ]);
}

easyrtc.listen(tubertcApp, socketServer);
