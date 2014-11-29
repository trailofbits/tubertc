Tuber-time Communications
=====
[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy?template=https://github.com/heroku/node-js-sample) [![Code Climate](https://codeclimate.com/github/trailofbits/tubertc/badges/gpa.svg)](https://codeclimate.com/github/trailofbits/tubertc)

Peer-to-peer video chat that works. It's tuber-time!

## Features
* Video chat with up to 6 people (limited only by user interface)
* Buttons to selectively mute audio and turn off video
* Client and server written in a single language: JavaScript
* Supported without client software by browsers with [WebRTC](http://caniuse.com/rtcpeerconnection)

## Anti-Features
* Does not require client software
* Does not send video stream through a 3rd party
* Does not spike your CPU at 100% utilization

## Requirements
* [EasyRTC](https://www.npmjs.org/package/easyrtc)
* [Express](https://www.npmjs.org/package/express)
* [nconf](https://www.npmjs.org/package/nconf)
* [socket.io](https://www.npmjs.org/package/socket.io)
* [NodeJS](http://nodejs.org/)

## Install to Heroku
tubertc supports Heroku as a demonstration platform. Deployment can be done via the one-click [Deploy to Heroku](https://heroku.com/deploy?template=https://github.com/heroku/node-js-sample) button or the commands below:

```
heroku login
git clone https://github.com/trailofbits/tubertc.git
cd tubertc
heroku create --http-git
git push heroku master
heroku ps:scale web=1
heroku open
heroku logs --tail
```

## Configuration
The server port, debug level, and SSL settings are configured via the `settings.json` file. tubertc uses port 8080, debug mode, and HTTP by default.