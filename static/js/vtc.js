/* Abstracts easyrtc functionality to enable easy reimplementing of this using custom WebRTC framework.
 * 
 * NOTE: This should be the only module that calls out to easyrtc API.
 *
 * Requires:
 *   easyrtc
 *   js/error.js
 */

// TODO: easyrtc.setOnError -> use this to handle errors with our Dialog class
// TODO: expose WebRTC support checking functions
var VTCCore = {
    // A function that checks browser support for WebRTC API. This can be called without
    // calling VTCCore.initialize
    isBrowserSupported : function () {
        return easyrtc.supportsGetUserMedia() && easyrtc.supportsPeerConnections();
    },

    
    initialize : function () {

    },

    finalize : function () {
        // TODO: hangupAll
        // TODO: leave room
        // TODO: disconnect from server
    }
};
