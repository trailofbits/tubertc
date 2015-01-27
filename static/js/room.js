/* Defines the VTC room logic.
 *
 * Requires:
 *   js/chat.js
 *   js/navbar.js
 *   js/dialog.js
 *   js/viewports.js
 *   Handlebars.js
 */

// Entry point for when the VTC chat is ready to start (after user clicks Join Room button)
var vtcMain = function (params) {
    // TODO(input): verify that passing params.roomName to .text() is not susceptible to XSS/etc
    $('#roomNameField')
        .text(params.roomName)
        .fadeIn(function () {
            // Change the browser's URL bar so that people can use it to give out
            // links to other future callers
            history.pushState({}, '', '/?room=' + escape(params.roomName));
            
            // Fade in the vtcRoom container used for placing the videos
            $('#vtcRoom').fadeIn();   
        });
    
    // Disables buttons as per states from buttons in params
    if (!params.cameraIsEnabled) {
        NavBar.cameraBtn.disableButton();
    }

    if (!params.micIsEnabled) {
        NavBar.micBtn.disableButton();
    }
    
    // Setup default VTC user interface state
    if (params.dashIsEnabled) {
        trtc_dash.showDashMode();
    } else {
        trtc_dash.showHangoutsMode();
    }
    
    // FIXME: For some reason, media-presence peer messages arrive before onStreamAccepted. This causes media-presence
    //        to be handled correctly since no peerId exists in idToViewPort. To deal with this, we need a queue to
    //        store all the messages for execution later.
    var mediaPresenceMap = {};

    // Instantiate the Chat object
    var chatRoom = new Chat(params.roomName);
       
    // Maps peerIds to Viewport objects
    var idToViewPort = {};

    // Helper for sending media presence messages
    var sendMediaPresence = function (client, mediaType, mediaEnabled) {
        client.sendPeerMessage({
            room : params.rtcName
        }, 'media-presence', {
            type : mediaType,
            enabled : mediaEnabled
        });
    };
    
    // Helper for handling media presence messages. 
    var handleMediaPresence = function (client, peerId, content) {
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

    VTCCore
        .initialize({
            cameraIsEnabled : params.cameraIsEnabled,
            micIsEnabled    : params.micIsEnabled
        })
        .onError(function (config) {
            Dialog.show(config);
        })
        .onPeerMessage(function (client, peerId, msgType, content) {
            if (msgType === 'chat' && typeof content.msg === 'string') {
                /* 'chat' peerMessage
                 *   Example format:
                 *     {
                 *       msg : <String>
                 *     } 
                 */
                chatRoom.addMessage(peerId, content.msg);
            } else if (msgType === 'media-presence' && 
                       typeof content.type === 'string' &&
                       typeof content.enabled === 'boolean') {
                /* 'media-presence' peerMessage
                 *   Example format:
                 *     {
                 *       type    : <String>,
                 *       enabled : <boolean>
                 *     }
                 *
                 *   Possible types:
                 *     'camera' : indicates a change in the camera status from a peer
                 *     'mic'    : indicates a change in the mic status from a peer
                 */
                

                if (idToViewPort[peerId] !== undefined) {
                    handleMediaPresence(client, peerId, content);
                } else {
                    if (mediaPresenceMap[peerId] === undefined) {
                        mediaPresenceMap[peerId] = [];
                    }

                    mediaPresenceMap[peerId].push(content);
                }
            } else {
                // FIXME: right now we don't have other messages to take care of
                ErrorMetric.log('peerMessage => got a peer message that is unexpected');
                ErrorMetric.log('            => peerId:  ' + peerId);
                ErrorMetric.log('            =>   name: ' + client.idToName(peerId));
                ErrorMetric.log('            => msgType: ' + msgType);
                ErrorMetric.log('            => content: ' + JSON.stringify(content));
            }
        })
        .onStreamAccept(function (client, peerId, stream) {
            var peerName = client.idToName(peerId);
            chatRoom.userEntered(peerId, peerName);
            
            // Create a new viewport and unmute the VideoElement
            var port = trtc_dash.createGridForNewUser(peerName);
            port.videoSrc.prop('muted', false);
            client.setVideoObjectSrc(port.videoSrc, stream);

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

            // XXX: send status from navbar buttons
            if (!NavBar.cameraBtn.isEnabled()) {
                sendMediaPresence(client, 'camera', false);
            }
            
            if (!NavBar.micBtn.isEnabled()) {
                sendMediaPresence(client, 'mic', false);
            }
        })
        .onStreamClose(function (client, peerId) {
            chatRoom.userLeft(peerId);
            
            var port = idToViewPort[peerId];
            if (port !== undefined) {
                trtc_dash.removeUserWithGrid(port);
                delete idToViewPort[peerId];
            } else {
                ErrorMetric.log('vtcMain => failed to find viewport for ' + peerId);
            }
        })
        .connect(params.userName, params.rtcName, function (client) {
            var myPeerId = client.getId();

            chatRoom
                .initialize(myPeerId, params.userName, function (message) {
                    return client.sendPeerMessage({
                        room : params.rtcName
                    }, 'chat', {
                        msg : message
                    });
                })
                .show();

            // Create a viewport for ourself and make it mirrored
            var viewport = trtc_dash.createGridForNewUser();
            viewport.videoSrc.addClass('video_mirror');
            client.setVideoObjectSrc(viewport.videoSrc, client.getLocalStream());

            idToViewPort[myPeerId] = viewport;

            // Only send initial state if they differ from the assumed state (which is enabled)
            if (!params.cameraIsEnabled) {
                sendMediaPresence(client, 'camera', false);
                viewport.showCamera(false);
            }

            if (!params.micIsEnabled) {
                sendMediaPresence(client, 'mic', false);
                viewport.showMic(false);
            }
            
            // Binds actions to the Enable/Disable Camera button
            NavBar.cameraBtn.handle(function () {
                client.enableCamera(true);
                sendMediaPresence(client, 'camera', true);
        
                viewport.showCamera(true);    
            }, function () {
                client.enableCamera(false);
                sendMediaPresence(client, 'camera', false);

                viewport.showCamera(false);
            });
            
            // Binds actions to the Enable/Disable Microphone button
            NavBar.micBtn.handle(function () {
                client.enableMicrophone(true);
                sendMediaPresence(client, 'mic', true);

                viewport.showMic(true);
            }, function () {
                client.enableMicrophone(false);
                sendMediaPresence(client, 'mic', false);

                viewport.showMic(false);
            });

            NavBar.dashBtn.handle(function () {
                trtc_dash.showDashMode();
            }, function () {
                trtc_dash.showHangoutsMode();
            });
    });
};

