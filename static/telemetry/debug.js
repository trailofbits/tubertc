/* Provides an interface for debugging WebRTC and numerous other aspects of
 * tubertc.
 *
 * Requires:
 *   js/vtc.js
 *   js/error.js
 */

// FIXME TODO: This is unfinished at this time. 
//
// The Listener component needs to be made such that it can handle requests from
// peers as well was respoonses to our requests.

var DebugConsole = {
    // Handles requests from other DebugConsole clients.
    Listener : function () {
        this.handlePeerMessage = function (client, peerId, content) {
            // TODO: handle testP2PConnection message
            if (typeof content.opcode === 'string') {
                if (content.opcode === 'testP2PConnection' &&
                    typeof content.targetPeerId === 'string' && 
                    typeof content.id === 'number') {
                    // TODO: implement me
                } else {
                    ErrorMetric.log('DebugConsole.Listener.handlePeerMessage => ');
                    ErrorMetric.log('  unsupported opcode "' + content.opcode + '"');
                }
            } else {
                ErrorMetric.log('DebugConsole.Listener.handlePeerMessage => ');
                ErrorMetric.log('  content.opcode is of the wrong type or doesn\'t exist');
            }
        };

        return this;
    },
    
    // Stores the VTCClient Object and idToViewPort Object for use with DebugConsole.Client
    /* Format:
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
    
    // ENTRY: In the debugger console, call this function to get an instance of the Client object.
    //        The Client object provides debugging capabilities.
    getClient : function () {
        if (this._vtcClientObj === null) {
            ErrorMetric.log('DebugConsole.getClient => _vtcClientObj is not set!');
            return null;
        }

        return new this.Client(this._vtcClientObj);
    },

    // The class that implements the "client" capbilities of the tubertc debugger.
    Client : function (clientObj) {
        // TODO: have functions do diagnostic information

        /* Parameters:
         *   None
         * 
         * Returns:
         *   An Array of peerIds of all users in the current room.
         */
        this.getRoomUserList = function () {
            return Object.keys(DebugConsole._vtcObj.roomList);
        };
        
        // Returns the P2P connection status between the current user and the peerId
        this.getP2PConnectStatusTo = function (peerId) {
            return DebugConsole._vtcObj.client.getConnectStatus(peerId);
        };
        
        // TODO: a function that sends testP2PConnection message
        return this;
    }
};
