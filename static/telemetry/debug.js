/* Provides an interface for debugging WebRTC and numerous other aspects of
 * tubertc.
 *
 * Requires:
 *   js/vtc.js
 *   js/error.js
 */

var DebugConsole = {
    // Handles requests from other DebugConsole clients.
    Listener : function () {
        this.handlePeerMessage = function (client, peerId, content) {
            
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
    
    _roomList : null,

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

        return this;
    }
};
