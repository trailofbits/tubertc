/* Provides an interface for debugging WebRTC and numerous other aspects of
 * tubertc.
 *
 * Requires:
 *   js/vtc.js
 *   js/error.js
 */

// TODO: Treat the DebugConsole as a command line program. Add help and ideally
//       print error message and verbose help messages if things are not what
//       is expected (like calling function with wrong arguments, etc.)

var DebugConsole = {
    // Handles calling callbacks upon transaction completion.  
    _txid : 0,
    _transactionMap : {},
    _getTxid : function () {
        return this._txid++;
    },
    _registerTransaction : function (id, completionFn) {
        this._transactionMap[id] = completionFn;
    },

    // Handles requests from other DebugConsole clients.
    Listener : function () {
        this.handlePeerMessage = function (client, peerId, content) {
            if (typeof content.opcode === 'string') {
                if (content.opcode === 'testP2PConnection' &&
                    typeof content.id === 'number') {
                    var roomList = DebugConsole._getRoomUserList();
                    var roomConnectStatus = {
                        myPeerId : client.getId(),
                        data     : {}
                    };

                    // Go through each peerId in the roomList and get the connect status for each
                    for (var i = 0; i < roomList.length; i++) {
                        // Ignore self P2P connection
                        if (roomList[i] !== client.getId()) {
                            roomConnectStatus.data[roomList[i]] = client.getConnectStatus(roomList[i]);
                        }
                    }
                    
                    ErrorMetric.log('[testP2PConnection] {' + peerId + '} request handled');

                    client.sendPeerMessage({
                        rtcId : peerId
                    }, 'debug', {
                        id     : content.id,
                        opcode : "response",
                        data   : roomConnectStatus
                    });
                } else if (content.opcode === 'response' &&
                           content.data !== undefined &&
                           typeof content.id === 'number') {
                    var transaction = DebugConsole._transactionMap[content.id];
                    if (transaction !== undefined) {
                        // Call completion callback function
                        transaction(content.data);
                        delete DebugConsole._transactionMap[content.id];
                    } else {
                        ErrorMetric.log('DebugConsole.Listener.handlePeerMessage => ');
                        ErrorMetric.log('  invalid id ' + content.id);
                    }
                } else {
                    ErrorMetric.log('DebugConsole.Listener.handlePeerMessage => ');
                    ErrorMetric.log('  unsupported opcode "' + content.opcode + '"');
                }
            } else {
                ErrorMetric.log('DebugConsole.Listener.handlePeerMessage => ');
                ErrorMetric.log('  content.opcode is of the wrong type or doesn\'t exist');
                ErrorMetric.log('  ' + JSON.stringify(content));
            }
        };

        return this;
    },
    
    /* Stores the VTCClient Object and idToViewPort Object for use with DebugConsole.Client
     * Format:
     *   {
     *     roomList : {
     *       peerId : String => ViewPort
     *     },
     *     client : VTCClient
     *   }
     */
    _vtcObj : null,
    setVtcObject : function (client) {
        this._vtcObj = client;
    },
    
    _getRoomUserList : function () {
        return Object.keys(this._vtcObj.roomList);
    },

    // ENTRY: In the debugger console, call this function to get an instance of the Client object.
    //        The Client object provides debugging capabilities.
    getClient : function () {
        if (this._vtcObj === null) {
            ErrorMetric.log('DebugConsole.getClient => _vtcObj is not set!');
            return null;
        }

        return new this.Client(this._vtcObj);
    },

    // The class that implements the "client" capbilities of the tubertc debugger.
    Client : function (clientObj) {
        /* Parameters:
         *   None
         * 
         * Returns:
         *   An Array of peerIds of all users in the current room.
         */
        this.getRoomUserList = function () {
            return DebugConsole._getRoomUserList();
        };
        
        // Remotely mutes a peerId on the call
        this.remoteMute = function (peerId) {
            if (peerId === undefined) {
                console.log('Usage: \n');
                console.log('  Client.remoteMute(\n');
                console.log('    peerId : string\n');
                console.log('  )\n\n');
                console.log('    Given a peerId, this function sends a \'mic-control\' peer message from \n');
                console.log('    the current user to the user specified by the peerId to shut off the target\n');
                console.log('    user\'s microphone.');

                return false;
            }
            
            var client = DebugConsole._vtcObj.client;
            client.sendPeerMessage({
                rtcId : peerId
            }, 'mic-control', {
                enabled : false
            });
        };

        // Returns the P2P connection status between the current user and the peerId
        this.getP2PConnectStatusTo = function (peerId) {
            if (peerId === undefined) {
                console.log('Usage: \n');
                console.log('  Client.getP2PConnectStatusTo(\n');
                console.log('    peerId : string\n');
                console.log('  ) : string\n\n');
                console.log('    Given a peerId, this function checks the peer connection status between\n');
                console.log('    the current user and the remote user as specified by their peerId. The\n');
                console.log('    returned value of this should be a string indicating the status of the\n');
                console.log('    of the connection: "is connected", "connection in progress to us.", \n');
                console.log('    "not connected".\n');

                return false;
            }

            return DebugConsole._vtcObj.client.getConnectStatus(peerId);
        };
        
        this.getP2PDiagnosticForPeerId = function (peerId, completionFn) {
            if (peerId === undefined || completionFn === undefined) {
                console.log('Usage: \n');
                console.log('  Client.getP2PDiagnosticForPeerId(\n');
                console.log('    peerId : string,\n');
                console.log('    completionFn : function (\n');
                console.log('                     Object({\n');
                console.log('                       myPeerId : string,\n');
                console.log('                       data : Object({\n');
                console.log('                                peerId : string => connectStatus : string\n');
                console.log('                              })\n');
                console.log('                     })\n');
                console.log('                   )\n');
                console.log('  )\n\n');
                console.log('    Sends a request to the specified peerId asking for a structure containing\n');
                console.log('    the P2P connection status of the peerId in relation to other callers. The\n');
                console.log('    resultant structure is a list of the statuses between the peerId and its\n');
                console.log('    peers.\n');

                return false;
            }

            var client = DebugConsole._vtcObj.client;
            var txid = DebugConsole._getTxid();
            client.sendPeerMessage({
                rtcId : peerId
            }, 'debug', {
                opcode : "testP2PConnection",
                id     : txid,
            });
            DebugConsole._registerTransaction(txid, completionFn);
        };
        
        this.getP2PDiagnostics = function (completionFn) {
            if (completionFn === undefined) {
                console.log('Usage: \n');
                console.log('  Client.getP2PDiagnostics(\n');
                console.log('    completionFn : function(Object({\n');
                console.log('                              peerId : string => structure from the completion function\n');
                console.log('                                                 argument in Client.getP2PDiagnosticForPeerId\n');
                console.log('                            })\n');
                console.log('                    )\n');
                console.log('  )\n\n');
                console.log('    Issues Client.getP2PDiagnosticForPeerId call to everyone in the room and aggregates the\n');
                console.log('    information as an argument to the completion function.\n');

                return false;
            }

            var myId = DebugConsole._vtcObj.client.getId();
            var roomList = DebugConsole._getRoomUserList().filter(function (elem) {
                return elem !== myId;
            });
            var roomSize = roomList.length;
            var results = [];
            
            var appendDataFn = function (data) {
                results.push(data);

                if (results.length === roomSize) {
                    completionFn(results);
                }
            };

            for (var i = 0; i < roomList.length; i++) {
                this.getP2PDiagnosticForPeerId(roomList[i], appendDataFn);
            }
        };
        
        // TODO: Have a pretty print of the data returned by getP2PDiagnostics showing
        //       the pairs of peerIds and their connection status:
        //
        //       {
        //         toPeerId   : String,
        //         fromPeerId : String
        //         status     : String
        //       }

        return this;
    }
};
