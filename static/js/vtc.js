/* Abstracts easyrtc functionality to enable easy reimplementing of this using custom WebRTC framework.
 * 
 * NOTE: This should be the only module that calls out to easyrtc API.
 *
 * Requires:
 *   easyrtc
 *   js/error.js
 *   js/dialog.js
 */

// FIXME: what functions are contained in here?
// TODO: Functionality that needs to be exported
//   * sendPeerMessage
//   * enableCamera
//   * enableMicrophone
//   * getRoomName
//   * map of peerId -> viewport divs?
// TODO: should we have a map that maps peerId to div element? (PROBABLY)
var VTCClient = function () {
    this.getRoomName = function () {

    };

    return this;
};

// FIXME: what functions are contained in here?
var VTCCore = {
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

            Dialog.show({
                title   : 'An Error Has Occurred',
                content : 'There has been a problem with the VTC session, please reload the page.' + 
                          '<br><br>' +
                          '<b>Error Code</b>: ' + errorObject.errorCode + '<br>' +
                          '<b>Summary</b>: ' + errorObject.errorText
            });
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
            // TODO: call everyone in the peer list
        });
        
        // TODO: initMediaStream and connect
        easyrtc.initMediaSource(function () {
            easyrtc.connect('tubertc', function (myId) {
                // TODO: instantiate VTCClient object
                // TODO: add myId to VTCClient object
                // TODO: add userName, roomName to VTCClient object
                // TODO: call successFn with VTCClient object as argument
            }, function (errorCode, errorText) {
                ErrorMetric.log('easyrtc.connect => failed to connect');
                ErrorMetric.log('                => ' + errorCode + ': ' + errorText);
                
                // FIXME: proofread and make this text better
                Dialog.show({
                    title   : 'An Error Has Occurred',
                    content : 'We are unable to join the video teleconferencing session.<br><br>' +
                              '<b>Error Code</b>: ' + errorCode + '<br>' +
                              '<b>Error Text</b>: ' + errorText
                });
            });
        }, function (errorCode, errorText) {
            ErrorMetric.log('easyrtc.initMediaSource => unable to initialize media source');
            ErrorMetric.log('                        => ' + errorCode + ': '+ errorText);
            
            // FIXME: proofread and make this text better
            Dialog.show({
                title   : 'Unable to Initialize Media Sources',
                content : 'We are unable to gain access to your media sources. ' +
                          'Did you forget to grant us permission to use the camera/microphone?<br><br>' +
                          '<b>Error Code</b>: ' + errorCode + '<br>' +
                          '<b>Error Text</b>: ' + errorText
            });
        });

        return this;
    },
    
    // TODO: what other API to put here?

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
