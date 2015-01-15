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
var VTCClient = function () {
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
        
        // TODO: what other things to do here?
        console.log('VTCCore.initialize');
        return this;
    },
    
    // TODO: figure out what other API to put here
    connect : function (userName, roomName) {
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
        
        // TODO: ensure easyrtc callbacks are set?
        // TODO: initMediaStream and connect

        return this;
    },
    
    finalize : function () {
        // TODO: hangupAll
        // TODO: leave room
        // TODO: disconnect from server
    }
};
