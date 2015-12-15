/**
 * @file Defines the VTC room logic.
 *
 * @requires module:js/chat
 * @requires module:js/error
 * @requires module:js/navbar
 * @requires module:js/dialog
 * @requires module:js/viewports
 * @requires module:js/audiometer
 * @requires Handlebars.js
 *
 * telemetry/debug.js is optional.
 */

'use strict';

/**
 * Entry point for when the VTC chat is ready to start
 * (after user clicks Join Room button).
 *
 * @param {Object} params - Initialization parameters.
 * @returns {undefined} undefined
 * @public
 */
var vtcMain = function(params) {
    // @todo XXX(debug): If debugging mode is enabled (DebugConsole is a valid function),
    // instantiate a new instance of DebugConsole
    var dbgListener = null;
    if (typeof DebugConsole === 'object' && typeof DebugConsole.Listener === 'function') {
        dbgListener = new DebugConsole.Listener();
    }

    // @todo (input): verify that passing params.roomName to .text() is not susceptible to XSS/etc
    $('#roomNameField')
        .text(params.roomName)
        .fadeIn(function() {
            // Change the browser's URL bar so that people can use it to give out
            // links to other future callers
            history.pushState({}, '', '/?room=' + escape(params.roomName));

            // Fade in the vtcRoom container used for placing the videos
            $('#vtcRoom').fadeIn();
        });

    // Disables camera if the camera button is disabled (because no camera was found)
    if (!params.hasCamera) {
        NavBar.cameraBtn.disableButton();
    }

    // Disables mic if the mic button is disabled (because no mic was found)
    if (!params.hasMic) {
        NavBar.micBtn.disableButton();
    }

    // Set up default VTC user interface state
    if (params.dashIsEnabled) {
        trtcDash.showDashMode();
    } else {
        trtcDash.showHangoutsMode();
    }

    // @todo FIXME: For some reason, media-presence peer messages arrive before onStreamAccepted. This causes media-presence
    //              to be handled correctly since no peerId exists in idToViewPort. To deal with this, we need a queue to
    //              store all the messages for execution later.
    var mediaPresenceMap = {};

    // Instantiate the Chat object
    var chatRoom = new Chat(params.roomName);

    // Maps peerIds to Viewport objects
    var idToViewPort = {};

    /**
     * Helper for sending media presence messages.
     *
     * @param {Object} client - Client instance.
     * @param {String} mediaType - The media type.
     * @param {Boolean} mediaEnabled - True if
     * enabled, false otherwise.
     * @returns {undefined} undefined
     * @private
     */
    var sendMediaPresence = function(client, mediaType, mediaEnabled) {
        client.sendPeerMessage({
            room: params.rtcName
        }, 'media-presence', {
            type: mediaType,
            enabled: mediaEnabled
        });
    };

    /**
     * Helper for handling media presence messages.
     *
     * @param {Object} client - Client instance.
     * @param {String} peerId - The current peer ID.
     * @param {Object} content - Media presence message content.
     * @returns {undefined} undefined
     * @private
     */
    var handleMediaPresence = function(client, peerId, content) {
        var viewport = idToViewPort[peerId];
        if (viewport !== undefined) {
            if (content.type === 'camera') {
                viewport.showCamera(content.enabled);
            } else if (content.type === 'mic') {
                viewport.showMic(content.enabled);
            } else {
                ErrorMetric.log('VTCCore.onPeerMessage => "' + content.type + '" is invalid');
            }
        } else {
            ErrorMetric.log('VTCCore.onPeerMessage => "' + peerId + '" is not a valid key');
        }
    };

    NavBar.cameraBtn.disableButton();
    NavBar.micBtn.disableButton();
    NavBar.dashBtn.disableButton();

    VTCCore
        .initialize({
            cameraIsEnabled: params.hasCamera,
            micIsEnabled: params.hasMic
        })
        .onError(function(config) {
            NavBar.cameraBtn.enableButton();
            NavBar.micBtn.enableButton();
            NavBar.dashBtn.enableButton();

            Dialog.show(config);
        })
        .onPeerMessage(function(client, peerId, msgType, content) {
            if (msgType === 'chat') {
                chatRoom.handlePeerMessage(peerId, content);
            } else if (msgType === 'media-presence' &&
                       typeof content.type === 'string' &&
                       typeof content.enabled === 'boolean') {
                // 'media-presence' peerMessage
                //   Example format:
                //     {
                //       type    : <String>,
                //       enabled : <boolean>
                //     }
                //
                //   Possible types:
                //     'camera' : indicates a change in the camera status from a peer
                //     'mic'    : indicates a change in the mic status from a peer
                if (idToViewPort[peerId] !== undefined) {
                    handleMediaPresence(client, peerId, content);
                } else {
                    if (mediaPresenceMap[peerId] === undefined) {
                        mediaPresenceMap[peerId] = [];
                    }

                    mediaPresenceMap[peerId].push(content);
                }
            } else if (msgType === 'debug') {
                // @todo XXX(debug): handle debug messages
                if (dbgListener !== null) {
                    dbgListener.handlePeerMessage(client, peerId, content);
                } else {
                    ErrorMetric.log('peerMessage => debug message got in non-debug mode!');
                }
            } else if (msgType === 'mic-control' && typeof content.enabled === 'boolean') {
                // @todo FIXME XXX XXX: Might be an issue with this feature. The ability to remotely
                //                      mute/unmute people might not be so cool (namely the unmute part).
                //                      For now, leave it in, but think about disabling the unmute feature
                //                      or having a config flag to deal with it.

                // 'mic-control' peerMessage
                //   Example format:
                //     {
                //       enabled : boolean
                //     }
                //
                if (peerId !== client.getId()) {
                    // Toggle the micBtn only if the requested microphone state is false (microphone disabled)
                    // and the current state is enabled.
                    //
                    // @todo XXX: probably not a good idea to have remote unmute capabilities
                    if (!content.enabled && content.enabled !== NavBar.micBtn.isSelected()) {
                        // clickButton is called because this causes the mute overlay to show up
                        NavBar.micBtn.clickButton();
                    }
                } else {
                    ErrorMetric.log('peerMessage => got a mute request from myself...ignoring');
                }
            } else if (msgType === 'audio-meter') {
                AudioMeter.handlePeerMessage(peerId, content);
            } else {
                // @todo FIXME: right now we don't have other messages to take care of
                ErrorMetric.log('peerMessage => got a peer message that is unexpected');
                ErrorMetric.log('            => peerId:  ' + peerId);
                ErrorMetric.log('            =>   name: ' + client.idToName(peerId));
                ErrorMetric.log('            => msgType: ' + msgType);
                ErrorMetric.log('            => content: ' + JSON.stringify(content));
            }
        })
        .onStreamAccept(function(client, peerId, stream) {
            var peerName = client.idToName(peerId);
            chatRoom.userEntered(peerId, peerName);

            // Create a new viewport and unmute the VideoElement
            var port = trtcDash.createGridForNewUser(peerName);
            port.videoSrc.prop('muted', false);
            client.setVideoObjectSrc(port.videoSrc, stream);

            if (typeof AudioMeter === 'object') {
                AudioMeter.create(peerId, stream, port.audioMeterFill);
            }

            idToViewPort[peerId] = port;

            // Handle deferred requests
            var peerIdMediaPresenceQueue = mediaPresenceMap[peerId];
            if (peerIdMediaPresenceQueue !== undefined) {
                while (peerIdMediaPresenceQueue.length > 0) {
                    var content = peerIdMediaPresenceQueue.shift();
                    handleMediaPresence(client, peerId, content);
                }
                delete mediaPresenceMap[peerId];
            }

            // @todo XXX: send status from navbar buttons
            if (!NavBar.cameraBtn.isSelected()) {
                sendMediaPresence(client, 'camera', false);
            }

            if (!NavBar.micBtn.isSelected()) {
                sendMediaPresence(client, 'mic', false);
            }
        })
        .onStreamClose(function(client, peerId) {
            chatRoom.userLeft(peerId);

            var port = idToViewPort[peerId];
            if (port !== undefined) {
                trtcDash.removeUserWithGrid(port);

                if (typeof AudioMeter === 'object') {
                    AudioMeter.destroy(peerId);
                }

                delete idToViewPort[peerId];
            } else {
                ErrorMetric.log('vtcMain => failed to find viewport for ' + peerId);
            }
        })
        .connect(params.userName, params.rtcName, function(client) {
            var stream = client.getLocalStream();
            var myPeerId = client.getId();

            NavBar.cameraBtn.enableButton();
            NavBar.micBtn.enableButton();
            NavBar.dashBtn.enableButton();

            // @todo XXX(debug): set the VTC client object so that instantiations of DebugConsole.getClient() in the
            //                   JavaScript debugger will work successfully.
            if (dbgListener !== null) {
                DebugConsole.setVtcObject({
                    roomList: idToViewPort,
                    client: client
                });
            }

            // Initialize AudioMeter namespace, this is needed because we need sendPeerMessage functionality
            if (typeof AudioMeter === 'object') {
                AudioMeter.init(client);
            }

            chatRoom
                .initialize(myPeerId, params.userName, function(message) {
                    return client.sendPeerMessage({
                        room: params.rtcName
                    }, 'chat', message);
                })
                .show();

            // Create a viewport for ourself and make it mirrored, hide it initially to ensure
            // a smooth transition if camera is initially disabled
            var viewport = trtcDash.createGridForNewUser();
            viewport.videoSrc
                .css('display', 'none')
                .addClass('video_mirror');
            client.setVideoObjectSrc(viewport.videoSrc, stream);

            if (typeof AudioMeter === 'object') {
                AudioMeter.create(myPeerId, stream, viewport.audioMeterFill, true);
            }

            idToViewPort[myPeerId] = viewport;

            // Only send initial state if they differ from the assumed state (which is enabled)
            if (!params.cameraIsEnabled) {
                client.enableCamera(false);
                sendMediaPresence(client, 'camera', false);
                viewport.showCamera(false);
            } else {
                viewport.showCamera(true);
            }

            if (!params.micIsEnabled) {
                client.enableMicrophone(false);
                sendMediaPresence(client, 'mic', false);
                viewport.showMic(false);
            }

            // Binds actions to the Enable/Disable Camera button
            NavBar.cameraBtn.handle(function() {
                client.enableCamera(true);
                sendMediaPresence(client, 'camera', true);

                viewport.showCamera(true);
            }, function() {
                client.enableCamera(false);
                sendMediaPresence(client, 'camera', false);

                viewport.showCamera(false);
            });

            // Binds actions to the Enable/Disable Microphone button
            NavBar.micBtn.handle(function() {
                client.enableMicrophone(true);
                sendMediaPresence(client, 'mic', true);

                viewport.showMic(true);
            }, function() {
                client.enableMicrophone(false);
                sendMediaPresence(client, 'mic', false);

                viewport.showMic(false);
            });

            NavBar.dashBtn.handle(function() {
                trtcDash.showDashMode();
            }, function() {
                trtcDash.showHangoutsMode();
            });
        });
};
