/* Implements the core easyrtc VTC stuff */

var VTC = {
    // Items
    roomObj : null,
    userName : null,
    
    // This dictionary contains a mapping of peerIds to their display names (user names)
    peerMap : {},
    
    // Maps peerIds to their easyrtc MediaStreams
    peerStreamMap : {},
    
    // Contains peerIds that do not yet have display names
    deferredJoin : {},
    
    // VTC entry point
    init : function (userName, roomName, roomObj) {
        this.roomObj = roomObj;
        this.userName = userName;
        
        // This is mostly for easyrtc.easyApp() and probably not needed (I think)
        easyrtc.dontAddCloseButtons(true);
        
        // Joins the easyrtc "room". Since we are not connected yet, no callbacks are invoked upon success
        // or failure
        easyrtc.joinRoom(roomName, null, null, null);

        this.setupCallbacks();
                
        easyrtc.initMediaSource(function () {
            // Our own videostream will be a member of the peerList as well. It will be mapped with the name
            // "self" for ease-of-use.
            roomObj.addPeer('self', userName, function (peerVideoObj) {
                easyrtc.setVideoObjectSrc(peerVideoObj.get(0), easyrtc.getLocalStream());
            });
            
            // For now, set the main video display to our own video stream
            roomObj.setMainPeer('self', function (id, peerVideoObj) {
                easyrtc.setVideoObjectSrc(peerVideoObj.get(0), easyrtc.getLocalStream());   
            });
            
            easyrtc.connect("VTC", function (myId) {
                // FIXME: is there anything we should do here?
                console.log('Got my peerId (' + myId + ')');
            }, function (errorCode, errText) {
                roomObj.showError('Error ' + errCode, errText);
            });
        }, function (errCode, errText) {
            roomObj.showError('Error ' + errCode, errText);
        });
    },
    
    // Sets up a majority of the callback handlers for the room object and easyrtc stuff.
    setupCallbacks : function () {
        var vtcObj = this;
        
        // We need to setup a callback handler for when the Room object needs to switch video sources for the 
        // main video screen. A callback is needed because the Room object should have no concept of the VTC
        // mechanisms used.
        this.roomObj.setSwitchMainVideoHandler(function (id, peerVideoObj) {
            if (vtcObj.peerStreamMap[id] !== undefined) {
                easyrtc.setVideoObjectSrc(peerVideoObj.get(0), vtcObj.peerStreamMap[id]);
            } else {
                // In almost all of the cases, if the id is not in peerStreamMap, it most likely is "self" and
                // getLocalStream() will be the correct target
                easyrtc.setVideoObjectSrc(peerVideoObj.get(0), easyrtc.getLocalStream());
            }
        });
        
        // Setup the functions that are invoked when the disable microphone/camera UI elements are clicked
        this.roomObj.setMuteButtonHandler(function (turnOn) {
            easyrtc.enableMicrophone(turnOn);
        });
        this.roomObj.setToggleCameraHandler(function (turnOn) { 
            easyrtc.enableCamera(turnOn);
        });

        // Set the handler for listening to control messages (and possibly chat)
        easyrtc.setPeerListener(function (peerId, msgType, content) {
            vtcObj.handlePeerMessages(peerId, msgType, content);   
        });
        
        // Alerts us to when remote streams call us
        easyrtc.setStreamAcceptor(function (peerId, stream) {
            vtcObj.handleAcceptStream(peerId, stream);
        });
        
        // As per the easyrtc multiparty.js example, this is only registered for one-time-use. After the first
        // invocation, this listener will be unregistered.
        easyrtc.setRoomOccupantListener(function (roomName, peerList) {
            vtcObj.initCallToPeers(peerList);
            easyrtc.setRoomOccupantListener(null);
        });
        
        // Alerts us as to when remote streams hang up
        easyrtc.setOnStreamClosed(function (peerId) {
            vtcObj.handleCloseStream(peerId);
        });
    },
    
    // This is the callback that is invoked on the presence of a new remote video stream
    handleAcceptStream : function (peerId, stream) {
        var displayName = this.peerMap[peerId];
        if (displayName === undefined) {
            console.log('could not find name for peerId ' + peerId + ', using peerId for now...');
            this.deferredJoin[peerId] = true;
            
            // Only show the first 12 characters of peerId
            displayName = peerId.substring(0, 12);
        }
        
        // Adds a peer in the Rooms UI
        this.roomObj.addPeer(peerId, displayName, function (peerVideoObj) {
            easyrtc.setVideoObjectSrc(peerVideoObj.get(0), stream);
        });
        
        // FIXME: what happens if there is already a peerStreamMap mapping of peerId?
        this.peerStreamMap[peerId] = stream;
    },
    
    // Handles a remote peer hanging up on the call (this is not called when an Android device puts Chrome
    // on the background and suspends the device).
    handleCloseStream : function (peerId) {
        if (this.peerMap[peerId] !== undefined && this.peerStreamMap[peerId] !== undefined) {
            this.roomObj.removePeer(peerId);
            delete this.peerMap[peerId];
            delete this.peerStreamMap[peerId];
        } else {
            // FIXME: what should happen if peerId isn't in peerMap or peerStreamMap?
        }
    },
    
    // Handles messages from peers. For our purposes, msgType can only for "info" for now. It might be necessary 
    // to add other messages in the future (some examples include "chat" for chat messages, etc.).
    handlePeerMessages : function (peerId, msgType, content) {
        if (msgType === "info") {
            // Ignore the message is peerId is already mapped to a display name
            if (this.peerMap[peerId] === undefined) {
                // Ignore the message if there is no "name" field
                if (content.name !== undefined) {
                    this.peerMap[peerId] = content.name;

                    // Checks to see if the peerId is one that we need to immediately update the UI
                    if (this.deferredJoin[peerId] !== undefined) {
                        this.roomObj.updatePeerName(peerId, content);
                        delete this.deferredJoin[peerId];
                    }
                    
                    // If the message requires us to respond, send a peer message back and specify that no response
                    // is necessary (to prevent a NOP message in response)
                    if (content.respond !== undefined && content.respond) {
                        easyrtc.sendPeerMessage(peerId, 'info', {
                            "name": this.userName,
                            "respond": false
                        });
                    }
                }
            }
        }
    },
    
    // This gets invoked upon connecting and entering the room. This should be only called once for our application.
    // The function gets passed a dictionary with peerIds of the other occupants as the keys. We take this each key
    // in the dictionary and both send them a message containing our display name and call them to obtain a video stream.
    initCallToPeers : function (peerList) {
        var vtcObj = this;
        var peersToCall = Object.keys(peerList);
        var callPeers = function (i) {
            var peerId = peersToCall[i];
            easyrtc.sendPeerMessage(peerId, 'info', {
                "name": vtcObj.userName,
                "respond": true
            });
            easyrtc.call(peerId, function () {
                if (i > 0) {
                    callPeers(i - 1);
                }
            }, function (errorCode, errorText) {
                vtcObj.roomObj.showError('Error ' + errorCode, errorText);
                if (i > 0) {
                    callPeers(i - 1);
                }
            });
        };
        
        if (peersToCall.length > 0) {
            callPeers(peersToCall.length - 1);
        }
    }
};
