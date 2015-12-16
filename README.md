Tuber-time Communications
=========================

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)
[![Code Climate](https://codeclimate.com/github/trailofbits/tubertc/badges/gpa.svg)](https://codeclimate.com/github/trailofbits/tubertc)
[![Slack Status](https://empireslacking.herokuapp.com/badge.svg)](https://empireslacking.herokuapp.com)

Peer-to-peer video chat that works. It's tuber-time!

## Features
* Video chat with up to 15 people (limited only by user interface)
* Buttons to selectively mute audio and turn off video
* Client and server written in a single language: JavaScript
* Supported without client software by browsers with [WebRTC](http://caniuse.com/#feat=rtcpeerconnection)

## Anti-Features
* Does not require client software
* Does not require a Google+ account
* Does not send video stream through a 3rd party
* Does not spike your CPU at 100% utilization

## Requirements
* [EasyRTC](https://www.npmjs.org/package/easyrtc)
* [Express](https://www.npmjs.org/package/express)
* [Handlebars](http://handlebarsjs.com/)
* [nconf](https://www.npmjs.org/package/nconf)
* [socket.io](https://www.npmjs.org/package/socket.io)
* [NodeJS](https://nodejs.org/)

## Install to Heroku
tubertc supports Heroku as a demonstration platform. Deployment can be done via the one-click [Deploy to Heroku](https://heroku.com/deploy?template=https://github.com/trailofbits/tubertc) button or the commands below:

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

## FAQ

### I'm using Chrome and I get a PermissionDeniedError

Chrome 47 and higher block non-TLS access to WebRTC. Trying accessing Tuber with HTTPS. If you would like to help us develop Tuber, please consider writing [tools that assist with the creation and installation of TLS certificates](https://github.com/trailofbits/tubertc/issues/54) for local installations.

### Some users can't send or receive audio/video

Tuber has trouble talking with users behind NAT. Supporting these NAT requires a [properly configured and tested STUN/TURN server](https://github.com/trailofbits/tubertc/issues/8). As it stands, Tuber works fine on most corporate LANs but, due to this issue, has trouble working reliably on the open internet.
