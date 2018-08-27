/**
 * @file Abstracts easyrtc functionality to enable easy reimplementing
 * of this using custom WebRTC framework.
 * NOTE: This should be the only module that calls out to easyrtc API.
 *
 * @requires module:easyrtc
 * @requires module:js/error
 */

'use strict';

// This is a constant that should not be changed unless the GUI has been made
// to support more viewports. This number should include the user itself.
var kMaxCallersPerRoom = 15;

/**
 * Creates a new instance of the VTC client.
 *
 * @param {String} myId - The peer's ID.
 * @param {String} roomName - The room name.
 * @param {Function} onErrorFn - Error callback.
 * @class
 */
var VTCClient = function(myId, roomName, onErrorFn) {
    var _id = myId;
    var _room = roomName;

    /**
     * Gets the peer ID.
     *
     * @returns {String} The peer ID.
     * @public
     */
    this.getId = function() {
        return _id;
    };

    /**
     * Gets the room name.
     *
     * @returns {String} The room name.
     * @public
     */
    this.getRoomName = function() {
        return _room;
    };

    /**
     * Translates peer IDs to user names.
     *
     * @param {String} id - The peer ID
     * to be translated.
     * @returns {String} The user name
     * for the provided peer ID.
     * @public
     */
    this.idToName = function(id) {
        return easyrtc.idToName(id);
    };

    /**
     * Returns the status of the p2p connection
     * between the current user and the specified user.
     *
     * @param {String} id - The peer ID of the other user.
     * @returns {String} The status of the p2p connection between
     * the current user and the specified user. One of
     * NOT_CONNECTED | BECOMING_CONNECTED | IS_CONNECTED
     */
    this.getConnectStatus = function(id) {
        return easyrtc.getConnectStatus(id);
    };

    /**
     * Sets the video bandwidth.
     *
     * @param {Number} kbitsPerSecond - Rate
     * of video bandwidth in kilobits per second.
     * @returns {undefined} undefined
     * @public
     */
    this.setVideoBandwidth = function(kbitsPerSecond) {
        easyrtc.setVideoBandwidth(kbitsPerSecond);
    };

    /**
     * Enables or disables the camera based on the value of `state`.
     *
     * @param {Boolean} state - The new state of the camera.
     * @returns {undefined} undefined
     * @public
     */
    this.enableCamera = function(state) {
        easyrtc.enableCamera(state);
    };

    /**
     * Enables or disables the microphone based on the value of `state`.
     *
     * @param {Boolean} state - The new state of the microphone.
     * @returns {undefined} undefined
     * @public
     */
    this.enableMicrophone = function(state) {
        easyrtc.enableMicrophone(state);
    };

    /**
     * Sends a message to another peer.
     *
     * @param {Object} dest - An object describing the message
     * destination. It should contain just one of the following:
     *     rtcId: String
     *     room: String
     * @param {String} msgType - Type of message (specific to the application).
     * @param {Object} msgData - Message contents (must be JSON-able).
     * @param {Function} successFn - Callback function with server response
     * results. It takes two arguments: a msgType and some msgData.
     * @returns {Boolean} True on success, false otherwise.
     * @public
     */
    this.sendPeerMessage = function(dest, msgType, msgData, successFn) {
        var target = {};
        if (typeof dest !== 'object' ||
            (typeof dest.rtcId !== 'string' && typeof dest.room !== 'string')) {
            ErrorMetric.log('VTCClient.sendPeerMessage => dest object is invalid');
            ErrorMetric.log('                          => ' + JSON.stringify(dest));

            return false;
        }

        if (typeof dest.rtcId === 'string' && typeof dest.room === 'string') {
            ErrorMetric.log('VTCClient.sendPeerMessage => both rtcId and room fields provided');

            return false;
        } else if (typeof dest.rtcId === 'string') {
            target.targetEasyrtcid = dest.rtcId;
        } else if (typeof dest.room === 'string') {
            target.targetRoom = dest.room;
        } else {
            ErrorMetric.log('VTCClient.sendPeerMessage => unexpected state');
            ErrorMetric.log('                          => ' + JSON.stringify(dest));

            return false;
        }

        easyrtc.sendPeerMessage(target, msgType, msgData, function(msgType, msgData) {
            if (successFn !== undefined) {
                successFn(msgType, msgData);
            }
        }, function(errorCode, errorText) {
            ErrorMetric.log('easyrtc.sendPeerMessage => failed to send peer message');
            ErrorMetric.log('                        => ' + errorCode + ': ' + errorText);

            if (onErrorFn !== undefined) {
                onErrorFn({
                    title: 'Failed to Send Message',
                    content: 'An error occurred while sending an internal message.<br><br>' +
                              '<b>Error Code</b>: ' + errorCode + '<br>' +
                              '<b>Error Text</b>: ' + errorText
                });
            }
        });
        return true;
    };

    /**
     * Obtains and returns the requested (via enableAudio/enableVideo) media sources.
     * @returns {Object} MediaStream object for the local media sources.
     * @public
     */
    this.getLocalStream = function() {
        return easyrtc.getLocalStream();
    };

    /**
     * Binds stream to the provided videoSel.
     * NOTE: Upon any DOM element manipulation of the video element, the video stream
     * will pause. This can be remedied by calling .load() on the raw video DOM element.
     *
     * @param {Object} videoSel - A jQuery selector for a video element. This *must* be
     * a jQuery selector because we call .get(0) on it in this function.
     * @param {Object} stream - MediaStream object to which videoSel will be bound.
     * @returns {undefined} undefined
     * @public
     */
    this.setVideoObjectSrc = function(videoSel, stream) {
        easyrtc.setVideoObjectSrc(videoSel.get(0), stream);
    };

    return this;
};

var VTCCore = {
    // This function is an user-defined error handler.
    // Type: function(Object({ title: String, content: String }))
    _errorFn: null,

    // Contains the configuration of the media devices.
    // Object structure:
    //   {
    //     cameraIsEnabled : <boolean>,
    //     micIsEnabled    : <boolean>
    //   }
    config: null,

    // An instantiation of VTCClient.
    client: null,

    /**
     * Checks browser support for the WebRTC API. This
     * can be called without calling VTCCore.initialize().
     *
     * @returns {Boolean} True if WebRTC is supported,
     * false otherwise.
     * @public
     */
    isBrowserSupported: function() {
        return easyrtc.supportsGetUserMedia() && easyrtc.supportsPeerConnections();
    },

    /**
     * Validates a configuration object. If this function is given an argument, it
     * will check to ensure the config is valid. Otherwise, it will check to see if
     * VTCCore.config is a valid configuration object.
     *
     * @param {Object} config - Configuration object.
     * @returns {Boolean} True if config is valid, false otherwise.
     * @private
     */
    _validateConfig: function(config) {
        if (config === undefined) {
            config = this.config;
        }

        if (config === null) {
            return false;
        }

        if (typeof config.cameraIsEnabled === 'boolean' &&
            typeof config.micIsEnabled === 'boolean') {
            return true;
        } else {
            return false;
        }
    },

    /**
     * Initializes the VTCCore instance.
     *
     * @param {Object} config - Configuration object of the shape:
     *   {
     *       cameraIsEnabled : <boolean>,
     *       micIsEnabled    : <boolean>
     *   }
     * Contains three fields denoting the initial state of the media devices.
     * @returns {Object} Null if the config is invalid; otherwise,
     * returns the current instance (`this`).
     * @public
     */
    initialize: function(config) {
        var _this = this;
        if (!this._validateConfig(config)) {
            ErrorMetric.log('VTCCore.initialize => config is invalid');
            ErrorMetric.log('                   => ' + JSON.stringify(config));

            // Break chaining
            return null;
        }

        this.config = config;

        easyrtc.setOnError(function(errorObject) {
            ErrorMetric.log('easyrtc.onError => An error has occurred with easyrtc');
            ErrorMetric.log('                => code: ' + errorObject.errorCode);
            ErrorMetric.log('                => text: ' + errorObject.errorText);

            if (_this._errorFn !== undefined) {
                _this._errorFn({
                    title: 'An Error Has Occurred',
                    content: 'There has been a problem with the VTC session, please reload the page.' +
                              '<br><br>' +
                              '<b>Error Code</b>: ' + errorObject.errorCode + '<br>' +
                              '<b>Summary</b>: ' + errorObject.errorText
                });
            }
        });

        return this;
    },

    /**
     * Sets a custom handler for messages sent by other peers.
     *
     * @param {Function} peerMessageFn - A callback function
     * that is called when a peer message arrives. It's of the form:
     * function(client  : VTCClient,
     *          peerId  : String,
     *          msgType : String,
     *          content : Object)
     * @returns {Object} The VTCCore instance.
     * @public
     */
    onPeerMessage: function(peerMessageFn) {
        var _this = this;
        easyrtc.setPeerListener(function(peerId, msgType, content) {
            peerMessageFn(_this.client, peerId, msgType, content);
        });

        return this;
    },

    /**
     * Sets a custom handler to receive streams from other peers.
     *
     * @param {Function} streamAcceptFn - A callback function that
     * is called when a new stream is "accepted". It's of the form:
     * function(client : VTCClient,
     *          peerId : String,
     *          stream : MediaStream)
     * @returns {Object} The VTCCore instance.
     * @public
     */
    onStreamAccept: function(streamAcceptFn) {
        var _this = this;
        easyrtc.setStreamAcceptor(function(peerId, stream) {
            streamAcceptFn(_this.client, peerId, stream);
        });

        return this;
    },

    /**
     * Handles stream close events.
     *
     * @param {Function} streamCloseFn - A callback function
     * that is called when a stream is closed. It's of the form:
     * function(client : VTCClient,
     *          peerId : String)
     * @returns {Object} The VTCCore instance.
     * @public
     */
    onStreamClose: function(streamCloseFn) {
        var _this = this;
        easyrtc.setOnStreamClosed(function(peerId) {
            streamCloseFn(_this.client, peerId);
        });

        return this;
    },

    /**
     * Error handler.
     *
     * @param {Function} errorFn - Callback that is called
     * when an error condition arises. It's of the form:
     * function(Object({
     *              title   : String,
     *              content : String<HTML>
     *          })
     * @returns {Object} The VTCCore instance.
     * @public
     */
    onError: function(errorFn) {
        this._errorFn = errorFn;
        return this;
    },

    /**
     * Connects to the API. Before calling this function, it is recommended
     * to have already called onPeerMessage, onStreamAccept, and onStreamClose
     * with appropriate callback functions. It is possible that setting the
     * callbacks after invoking easyrtc.connect might cause events to be lost.
     *
     * @param {String} userName - The name of the connecting user.
     * @param {String} roomName - The name of the room to be joined.
     * @param {Function} successFn - The callback function to be called
     * upon successfully joining the room. It's of the form:
     * function(VTCClient)
     * @returns {Object} Null if there was a connection error; otherwise,
     * returns the VTCCore instance.
     * @public
     */
    connect: function(userName, roomName, successFn) {
        if (!this._validateConfig()) {
            ErrorMetric.log('VTCCore.connect => config changed somehow...');
            ErrorMetric.log('                => ' + JSON.stringify(this.config));

            // Break chaining
            return null;
        }

        easyrtc.enableVideo(this.config.cameraIsEnabled);
        easyrtc.enableAudio(this.config.micIsEnabled);

        if (!easyrtc.setUsername(userName)) {
            ErrorMetric.log('VTCCore.connect => could not set username to ' + userName);

            // Break chaining
            return null;
        }

        var _this = this;
        easyrtc.setRoomOccupantListener(function(roomName, peerList) {
            var peersToCall = Object.keys(peerList);
            var onCallError = function(errorCode, errorText) {
                ErrorMetric.log("easyrtc.call => [error] failed to call " + peerId);
                ErrorMetric.log("easyrtc.call => " + errorCode + ': ' + errorText);
            };

            var peersCount = peersToCall.length;
            if (peersCount > 0) {
                if (peersCount < kMaxCallersPerRoom) {
                    for (var i = 0; i < peersToCall.length; i++) {
                        var peerId = peersToCall[i];

                        easyrtc.call(peerId, null, onCallError, null);
                    }
                } else {
                    // NOTE (security): This check and many others do not prevent users from force joining
                    //                  a room by running JavaScript. It might be a good idea in the future
                    //                  to enforce these limits of the server side.
                    if (_this._errorFn !== undefined) {
                        _this._errorFn({
                            title: 'Room "' + roomName + '" is full.',
                            content: 'The videoconferencing room <b>' + roomName + '</b> has reached capacity.<br><br>' +
                                           'The maximum amount of people in a room is ' + kMaxCallersPerRoom + ', please ' +
                                           'selected another room by reloading the page.',
                            forceRefresh: true
                        });
                    }
                }
            }

            easyrtc.setRoomOccupantListener(null);
        });

        easyrtc.initMediaSource(function() {
            easyrtc.connect('tubertc', function(myId) {
                easyrtc.joinRoom(roomName, null, function(roomName) {
                    _this.client = new VTCClient(myId, roomName, _this._errorFn);

                    if (successFn !== undefined) {
                        successFn(_this.client);
                    }
                }, function(errorCode, errorText, roomName) {
                    if (_this._errorFn !== undefined) {
                        _this._errorFn({
                            title: 'Failed to join room',
                            content: 'We are unable to join the video teleconference room.<br><br>' +
                                     '<b>Error Code</b>: ' + errorCode + '<br>' +
                                     '<b>Error Text</b>: ' + errorText
                        })
                    }
                });
            }, function(errorCode, errorText) {
                ErrorMetric.log('easyrtc.connect => failed to connect');
                ErrorMetric.log('                => ' + errorCode + ': ' + errorText);

                // @todo FIXME: proofread and make this text better
                if (_this._errorFn !== undefined) {
                    _this._errorFn({
                        title: 'An Error Has Occurred',
                        content: 'We are unable to join the video teleconferencing session.<br><br>' +
                                  '<b>Error Code</b>: ' + errorCode + '<br>' +
                                  '<b>Error Text</b>: ' + errorText
                    });
                }
            });
        }, function(errorCode, errorText) {
            ErrorMetric.log('easyrtc.initMediaSource => unable to initialize media source');
            ErrorMetric.log('                        => ' + errorCode + ': ' + errorText);

            // @todo FIXME: proofread and make this text better
            if (_this._errorFn !== undefined) {
                _this._errorFn({
                    title: 'Unable to Initialize Media Sources',
                    content: 'We are unable to gain access to your media sources. ' +
                              'Did you forget to grant us permission to use the camera/microphone?<br><br>' +
                              '<b>Error Code</b>: ' + errorCode + '<br>' +
                              '<b>Error Text</b>: ' + errorText
                });
            }
        });

        return this;
    },

    /**
     * Returns the VTCClient instance.
     *
     * @returns {Object} The VTCClient instance.
     * @public
     */
    getClient: function() {
        return this.client;
    },

    /**
     * Cleans up (hangs up, leaves the
     * room, closes the connection, etc).
     *
     * @returns {undefined} undefined
     * @public
     */
    finalize: function() {
        var client = this.client;
        if (client !== null) {
            easyrtc.hangupAll();
            easyrtc.leaveRoom(client.getRoomName());
            easyrtc.disconnect();
            this.client = null;
        }

        // No return value because we do not expect this to be chained.
    }
};
