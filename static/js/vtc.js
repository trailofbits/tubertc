/* Implements the core easyrtc VTC stuff */

var VTC = {
    roomObj : null,
    userName : null,
    
    // Acquire peer names and map them to peerIds 
    peerMap : {},
    
    // Maps peerIds to peer MediaStreams
    peerStreamMap : {},
    
    // Contains peerId -> MediaStream mappings for deferred client call requests
    deferredJoin : {},

    init : function (userName, roomName, roomObj) {
        this.roomObj = roomObj;
        this.userName = userName;

        easyrtc.dontAddCloseButtons(true);
        easyrtc.joinRoom(roomName, null, null, null);

        this.setupCallbacks();
        
        easyrtc.initMediaSource(function () {
            // add ourself into the peers list
            roomObj.addPeer('self', userName, function (peerVideoObj) {
                easyrtc.setVideoObjectSrc(peerVideoObj.get(0), easyrtc.getLocalStream());
            });
            
            roomObj.setMainPeer('self', function (id, peerVideoObj) {
                easyrtc.setVideoObjectSrc(peerVideoObj.get(0), easyrtc.getLocalStream());   
            });

            easyrtc.connect("VTC", function (myId) {
                // TODO: not sure what else to do here...
                console.log('Got my peerId (' + myId + ')');
            }, function (errorCode, errText) {
                roomObj.showError('Error ' + errCode, errText);
            });
        }, function (errCode, errText) {
            roomObj.showError('Error ' + errCode, errText);
        });
    },
    
    setupCallbacks : function () {
        var vtcObj = this;
        
        // setup the callback for Room to use when switching the main video
        this.roomObj.setSwitchMainVideoHandler(function (id, peerVideoObj) {
            if (vtcObj.peerStreamMap[id] !== undefined) {
                easyrtc.setVideoObjectSrc(peerVideoObj.get(0), vtcObj.peerStreamMap[id]);
            } else {
                easyrtc.setVideoObjectSrc(peerVideoObj.get(0), easyrtc.getLocalStream());
            }
        });
        
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

        easyrtc.setStreamAcceptor(function (peerId, stream) {
            vtcObj.handleAcceptStream(peerId, stream);
        });
        
        easyrtc.setRoomOccupantListener(function (roomName, peerList) {
            vtcObj.initCallToPeers(peerList);
            easyrtc.setRoomOccupantListener(null);
        });

        easyrtc.setOnStreamClosed(function (peerId) {
            vtcObj.handleCloseStream(peerId);
        });
    },
    
    handleAcceptStream : function (peerId, stream) {
        if (this.peerMap[peerId] !== undefined && this.peerStreamMap[peerId] === undefined) {
            this.roomObj.addPeer(peerId, this.peerMap[peerId], function (peerVideoObj) {
                easyrtc.setVideoObjectSrc(peerVideoObj.get(0), stream);
            });
            
            this.peerStreamMap[peerId] = stream;
        } else {
            if (this.peerStreamMap[peerId] !== undefined) {
                // TODO: this stream is already defined...
                console.log("WARNING: peerId already has a stream...");
            }
            
            // On no name mappings, add to deferredJoin so that once a name mapping exists, the join occurs.
            // TODO:
            //   I'm not sure this is the best idea. The deferred join process causes a slight delay which might
            //   be annoying. An alternative can be load with the easyrtcId first and then update it with the real
            //   name once we obtain it.
            if (this.peerMap[peerId] === undefined) {
                console.log("Could not find name mapping for " + peerId);
                this.deferredJoin[peerId] = [peerId, stream];
            }
        }
    },
    
    handleCloseStream : function (peerId) {
        if (this.peerMap[peerId] !== undefined && this.peerStreamMap[peerId] !== undefined) {
            this.roomObj.removePeer(peerId);
            delete this.peerMap[peerId];
            delete this.peerStreamMap[peerId];
        } else {
            // TODO: this is not suppose to happen
        }
    },
    
    // Handles control and various other messages from peers
    handlePeerMessages : function (peerId, msgType, content) {
        if (msgType === "info") {
            if (this.peerMap[peerId] === undefined) {
                // add new peerId to name mapping
                this.peerMap[peerId] = content;
                
                // is the peerId something we are waiting for?
                if (this.deferredJoin[peerId] !== undefined) {
                    console.log("taking care of deferredJoins");
                    var args = this.deferredJoin[peerId];
                    this.handleAcceptStream(args[0], args[1]);
                    delete this.deferredJoin[peerId];
                }

                // send back our name
                easyrtc.sendPeerMessage(peerId, 'info', this.userName);
            }
        }
    },
    
    // Call and inform peers (
    initCallToPeers : function (peerList) {
        var vtcObj = this;
        var peersToCall = Object.keys(peerList);
        var callPeers = function (i) {
            var peerId = peersToCall[i];
            easyrtc.sendPeerMessage(peerId, 'info', vtcObj.userName);
            easyrtc.call(peerId, function () {
                console.log("calling " + peersToCall[i]);
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
