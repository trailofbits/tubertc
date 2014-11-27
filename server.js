
var fs = require('fs');
var io = require('socket.io');
var nconf = require('nconf');
var express = require('express');
var easyrtc = require('easyrtc');

var webServer = null;

// Try to find configuring files inthe following places (in order)
//   1. settings.json file
//   2. Environment variables
//   3. Command-line arguments
nconf.file({ file: 'settings.json' })
     .env()
     .argv();

// Web application setup (for setting up routes)
var tubertcApp = express();
var router = express.Router();

// TODO: setup application routes here

tubertcApp.use('/', router);
tubertcApp.use(express.static(__dirname + "/static/"));

// Setup web servers according to configuration file

// By default, debugMode is on. Deployment requires the existence of a settings.json
// configuration file
var debugMode = nconf.get('debug');
if (debugMode === undefined) {
    debugMode = true;
}

// By default the listening server port is 8080
var serverPort = nconf.get('port');
if (serverPort === undefined) {
    serverPort = 8080;
}

// By default, HTTP is used
var ssl = nconf.get('ssl');
if (ssl === undefined) {
    webServer = require('http').createServer(
        tubertcApp
    ).listen(serverPort);
} else {
    webServer = require('https').createServer(
        {
            key  : fs.readFileSync(ssl.key),
            cert : fs.readFileSync(ssl.cert)
        }
    ).listen(serverPort);
}

// Set log level according to debugMode, on production, log level is on error only
if (debugMode) {
    var ioOpts = {
        "log level" : 3
    };
} else {
    var ioOpts = {
        "log level" : 0
    };
}

var socketServer = io.listen(webServer, ioOpts);

// Setup easyrtc specific options
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
}

var rtcServer = easyrtc.listen(tubertcApp, socketServer);

