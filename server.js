// server.js

var HTTP_PORT = 8080;

var fs        = require("fs");
var http      = require("http");
var express   = require("express");
var io        = require("socket.io");
var easyrtc   = require("easyrtc");
var Mark      = require("markup-js");

var httpApp = express();
var router = express.Router();

// Preload room template
var roomTemplate = fs.readFileSync(__dirname + "/templates/room.html", "utf8");

// Setup application routes
router.get("/room/:name", function (req, res) {
    var context = {
        name: req.params.name.replace(/\W/g, '')
    };
    res.send(Mark.up(roomTemplate, context));
});
router.get("/room", function (req, res) {
    res.redirect("/");
});
httpApp.use("/", router);
httpApp.use(express.static(__dirname + "/static/"));


var webServer = http.createServer(httpApp).listen(HTTP_PORT);
var socketServer = io.listen(webServer, {"log level": 1});
var rtc = easyrtc.listen(httpApp, socketServer);
