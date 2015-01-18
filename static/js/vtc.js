/* Abstracts easyrtc functionality to enable easy reimplementing of this using custom WebRTC framework.
 * 
 * NOTE: This should be the only module that calls out to easyrtc API.
 *
 * Requires:
 *   easyrtc
 *   js/error.js
 */

var VTCClient = function (myId, roomName, onErrorFn) {
    var _id = myId;
    var _room = roomName;
    
    this.getId = function () {
        return _id;
    };

    this.getRoomName = function () {
        return _room;
    };
    
    /* Parameters:
     *   id : String
     *     The peer ID to be translated
     *
     * Translates peer IDs to user names
     */
    this.idToName = function (id) {
        return easyrtc.idToName(id);
    };

    /* Parameters:
     *   state : boolean
     *     The new state of the camera.
     *
     * Enables or disables the camera based off the value of state.
     */
    this.enableCamera = function (state) {
        easyrtc.enableCamera(state);
    };
    
    /* Parameters:
     *   state : boolean
     *     The new state of the microphone.
     *
     * Enables or disables the microphone based off of the value of state.
     */
    this.enableMicrophone = function (state) {
        easyrtc.enableMicrophone(state);
    };
    
    /* Parameters:
     *   dest      : Object
     *     A Object that should contain at just one of the following fields:
     *       rtcId : String
     *       room  : String
     *
     *   msgType   : String
     *     Type of message (specific to the application)
     *
     *   msgData   : Object
     *     Message contents (must be JSON-able)
     *
     *   successFn : function(msgType, msgData)
     *     Callback function with server response results
     *
     * This sends a message to another peer.
     */
    this.sendPeerMessage = function (dest, msgType, msgData, successFn) {
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
        
        easyrtc.sendPeerMessage(target, msgType, msgData, function (msgType, msgData) {
            if (successFn !== undefined) {
                successFn(msgType, msgData);
            }
        }, function (errorCode, errorText) {
            ErrorMetric.log('easyrtc.sendPeerMessage => failed to send peer message');
            ErrorMetric.log('                        => ' + errorCode + ': ' + errorText);

            if (onErrorFn !== undefined) {
                onErrorFn({
                    title   : 'Failed to Send Message',
                    content : 'An error occurred while sending an internal message.<br><br>' +
                              '<b>Error Code</b>: ' + errorCode + '<br>' +
                              '<b>Error Text</b>: ' + errorText
                });
            }
        });
        return true;
    };
    
    /* Returns:
     *   MediaStream
     *     MediaStream object for the local media sources.
     * 
     * Obtains and returns the requested (via enableAudio/enableVideo) media sources.
     */
    this.getLocalStream = function () {
        return easyrtc.getLocalStream();
    };

    // FIXME: document me better
    // Sets the video DOM element's source with the specified stream.
    // videoSel is a jQuery element!
    /* Parameters:
     *   videoSel : jQuery
     *     This is a jQuery selector for a video element. This *must* be a jQuery selector because
     *     we call .get(0) on it in this function.
     *
     *   stream : MediaStream
     *     This contains the MediaStream object in which videoSel will be bound to.
     *
     * This functions binds stream to the provided videoSel. 
     *
     * HINT:
     *   Upon any DOM element manipulation of the video element, the video stream will pause. This
     *   can be remedied by calling .load() on the raw video DOM element.
     */
    this.setVideoObjectSrc = function (videoSel, stream) {
        easyrtc.setVideoObjectSrc(videoSel.get(0), stream);
    };

    return this;
};

var VTCCore = {
    // This function is an user-defined error handler.
    // Type: function(Object({title: String, content: String}))
    _errorFn : null,

    // Contains the configuration of the media devices
    // Object structure:
    //   {
    //     cameraIsEnabled : <boolean>,
    //     micIsEnabled    : <boolean>
    //   }
    config : null,
    
    // An instantiation of VTCClient
    client : null,

    // A function that checks browser support for WebRTC API. This can be called without
    // calling VTCCore.initialize
    isBrowserSupported : function () {
        return easyrtc.supportsGetUserMedia() && easyrtc.supportsPeerConnections();
    },
    
    // Validates a configuration Object. If this function is given an argument, it will
    // check to ensure config is a valid configuration Object. Otherwise, it will check
    // to see if VTCCore.config is a valid configuration Object.
    _validateConfig : function (config) {
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

    /* Parameters: 
     *   config : Object({
     *              cameraIsEnabled : <boolean>,
     *              micIsEnabled    : <boolean>
     *            })
     *     Contains three fields denoting the initial state of the media devices.
     */
    initialize : function (config) {
        var _this = this;
        if (!this._validateConfig(config)) {
            ErrorMetric.log('VTCCore.initialize => config is invalid');
            ErrorMetric.log('                   => ' + JSON.stringify(config));

            // Break chaining
            return null;
        }
        
        this.config = config;

        easyrtc.setOnError(function (errorObject) {
            ErrorMetric.log('easyrtc.onError => An error has occurred with easyrtc');
            ErrorMetric.log('                => code: ' + errorObject.errorCode);
            ErrorMetric.log('                => text: ' + errorObject.errorText);
            
            if (_this._errorFn !== undefined) {
                _this._errorFn({
                    title   : 'An Error Has Occurred',
                    content : 'There has been a problem with the VTC session, please reload the page.' + 
                              '<br><br>' +
                              '<b>Error Code</b>: ' + errorObject.errorCode + '<br>' +
                              '<b>Summary</b>: ' + errorObject.errorText
                });
            }
        });
        
        return this;
    },
    
    /* Parameters:
     *   peerMessageFn : function (client : VTCClient, 
     *                             peerId : String, 
     *                             msgType : String, 
     *                             content : Object)
     *     This is a callback function that is called when a peer message arrives.
     *
     * This function sets a custom handler for messages sent by other peers. 
     */
    onPeerMessage : function (peerMessageFn) {
        var _this = this;
        easyrtc.setPeerListener(function (peerId, msgType, content) {
            peerMessageFn(_this.client, peerId, msgType, content);
        });

        return this;
    },
    
    /* Parameters:
     *   streamAcceptFn : function (client : VTCClient,
     *                              peerId : String, 
     *                              stream : MediaStream)
     *     This is a callback function that is called when a new stream is "accepted"
     *
     *   This function sets a custom handler to receive streams from other peers.
     */
    onStreamAccept : function (streamAcceptFn) {
        var _this = this;
        easyrtc.setStreamAcceptor(function (peerId, stream) {
            streamAcceptFn(_this.client, peerId, stream);
        });
        
        return this;
    },

    /* Parameters:
     *   streamClose : function(client : VTCClient,
     *                          peerId : String)
     *     This is a callback function that is called when a stream is closed.
     *
     *   Handles stream close events.
     */
    onStreamClose : function (streamCloseFn) {
        var _this = this;
        easyrtc.setOnStreamClosed(function (peerId) {
            streamCloseFn(_this.client, peerId);
        });

        return this;
    },
    
    /* Parameters:
     *   errorFn : function(Object({
     *               title   : String,
     *               content : String<HTML>
     *             })
     *     Callback that is called when an error condition arises
     */
    onError : function (errorFn) {
        this._errorFn = errorFn;
        return this;
    },

    // Parameters:
    //   userName : String
    //     The name of the connecting user.
    //   
    //   roomName : String
    //     The name of the room to be joined.
    //
    //   successFn : function(VTCClient)
    //     The callback function to be called upon successfully joining the room.
    // 
    // Before calling this function, it is recommended to have already called onPeerMessage, onStreamAccept, and
    // onStreamClose with appropriate callback functions. It is possible that setting the callbacks after invoking
    // easyrtc.connect might cause events to be lost.
    connect : function (userName, roomName, successFn) {
        if (!this._validateConfig()) {
            ErrorMetric.log('VTCCore.connect => config changed somehow...');
            ErrorMetric.log('                => ' + JSON.stringify(this.config));

            // Break chaining
            return null;
        }
        
        easyrtc.enableVideo(this.config.cameraIsEnabled);
        easyrtc.enableAudio(this.config.micIsEnabled);
        
        // No callbacks are invoked at this point because we are not connected yet.
        easyrtc.joinRoom(roomName, null, null, null);
        if (!easyrtc.setUsername(userName)) {
            ErrorMetric.log('VTCCore.connect => could not set username to ' + userName);

            // Break chaining
            return null;
        }
        
        easyrtc.setRoomOccupantListener(function (roomName, peerList) {
            var peersToCall = Object.keys(peerList);
            var callPeers = function (i) {
                var peerId = peersToCall[i];
                easyrtc.call(peerId, function () {
                    if (i > 0) {
                        callPeers(i - 1);
                    }
                }, function (errorCode, errorText) {
                    ErrorMetric.log('easyrtc.call => failed to call ' + peerId);
                    ErrorMetric.log('             => ' + errorCode + ': ' + errorText);

                    if (i > 0) {
                        callPeers(i - 1);
                    }
                });
            };

            if (peersToCall.length > 0) {
                callPeers(peersToCall.length - 1);
            }

            easyrtc.setRoomOccupantListener(null);
        });
        
        var _this = this;
        easyrtc.initMediaSource(function () {
            easyrtc.connect('tubertc', function (myId) {
                _this.client = new VTCClient(myId, roomName, _this._errorFn);

                if (successFn !== undefined) {
                    successFn(_this.client);
                }
            }, function (errorCode, errorText) {
                ErrorMetric.log('easyrtc.connect => failed to connect');
                ErrorMetric.log('                => ' + errorCode + ': ' + errorText);
                
                // FIXME: proofread and make this text better
                if (_this._errorFn !== undefined) {
                    _this._errorFn({
                        title   : 'An Error Has Occurred',
                        content : 'We are unable to join the video teleconferencing session.<br><br>' +
                                  '<b>Error Code</b>: ' + errorCode + '<br>' +
                                  '<b>Error Text</b>: ' + errorText
                    });
                }
            });
        }, function (errorCode, errorText) {
            ErrorMetric.log('easyrtc.initMediaSource => unable to initialize media source');
            ErrorMetric.log('                        => ' + errorCode + ': '+ errorText);
            
            // FIXME: proofread and make this text better
            if (_this._errorFn !== undefined) {
                _this._errorFn({
                    title   : 'Unable to Initialize Media Sources',
                    content : 'We are unable to gain access to your media sources. ' +
                              'Did you forget to grant us permission to use the camera/microphone?<br><br>' +
                              '<b>Error Code</b>: ' + errorCode + '<br>' +
                              '<b>Error Text</b>: ' + errorText
                });
            }
        });

        return this;
    },
    
    // Returns the VTCClient instance
    getClient : function () {
        return this.client;
    },

    finalize : function () {
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
