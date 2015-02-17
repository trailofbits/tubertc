/* Defines the audio meter that measures audio activity for each WebRTC
 * MediaStream.
 *
 * Requires:
 *   js/error.js
 *   js/navbar.js
 *
 * This is currently an experimental feature that can be enabled/disabled.
 *
 * Because of problems with Chrome's WebAudio/WebRTC implementation,
 * (see https://code.google.com/p/chromium/issues/detail?id=121673), we are currently using
 * socket.io to alert the other callers of our sound state.
 */

// This specifies how many audio samples to process at once. This must be a power of 2 with
// the maximum amount of samples at 16384. The bigger the buffer, the less often onaudioprocess
// is triggered. However, there will be more events to go through.
var kSampleSize = 16384;

// How often we take a sample.
var kSampleAverageInterval = 16;

var AudioMeter = {
    // Stores a mapping of peerId with objects needed to update and teardown associated items
    _map : {},
    
    // This will be set when init() is called and should be non-null
    _client : null,
    
    _animateFillMeter : function (fillMeter, rms) {
        fillMeter
            .stop()
            .animate({
                width : (rms * 100) + '%'
            }, 250);
    },

    /* Parameters:
     *   client : VTCClient
     *     VTCClient object of the current WebRTC session
     */
    init : function (client) {
        this._client = client;
    },

    /* Parameters:
     *   peerId : string
     *     Peer ID that sent the associated message
     *
     *   content : Object({
     *               rms : float  
     *             })
     *     Contains the decibel percentage for use with populating the "width"
     *     property of a DIV element.
     */
    handlePeerMessage : function (peerId, content) {
        if (peerId !== this._client.getId()) {
            var item = this._map[peerId];
            if (item !== undefined) {
                var fillMeter = item.fillMeter;
                if (typeof content.rms === 'number' && content.rms <= 1) {
                    this._animateFillMeter(fillMeter, content.rms);
                }
            } else {
                ErrorMetric.log('AudioMeter.handlePeerMessage => ' + peerId + ' is not valid');
            }
        }
    },

    /* Parameters:
     *   peerId : string
     *     Peer ID of the provided MediaStream object
     *
     *   stream : MediaStream
     *     MediaStream containing the audio and video information of the user.
     *
     *   meterFullElem : $(DIVElement)
     *     DIV element representing the decibel amount (0 to 100%)
     *  
     *   isLocalStream : boolean
     *     This indicates that the current AudioMeter to be created is for the local
     *     stream
     *
     * Creates a new AudioMeter for the MediaStream for peerId
     */
    create : function (peerId, stream, meterFillElem, isLocalStream) {
        var _this = this;
        var audioContext = null;
        var mediaStreamSource = null;
        var processor = null;
        var eventListenerId = null;

        var _broadcastRms = function (rms) {
            _this._client.sendPeerMessage({
                room : _this._client.getRoomName()
            }, 'audio-meter', {
                rms : rms
            });
        };

        if (isLocalStream !== undefined && isLocalStream) {
            eventListenerId = NavBar.micBtn.addToggleEventListener(function (state) {
                if (!state) {
                    // If the microphone is muted, immediately send a audio-meter message
                    // that resets the RMS. Otherwise, the audio meter will inaccurately 
                    // show the last known meter value.
                    _broadcastRms(0);
                }
            });

            audioContext = new AudioContext();
            mediaStreamSource = audioContext.createMediaStreamSource(stream);
            processor = audioContext.createScriptProcessor(kSampleSize, 1, 1);

            mediaStreamSource.connect(processor);
            processor.connect(audioContext.destination);
            
            processor.onaudioprocess = function (evt) {
                var buffer = evt.inputBuffer;
                if (buffer.numberOfChannels > 0) {
                    var inputData = buffer.getChannelData(0);
                    var inputDataLength = inputData.length;
                    var total = 0;
                    
                    // We calculate the average of every X to prevent CPU fans from kicking in
                    // on laptops!
                    for (var i = 0; i < inputDataLength; i += kSampleAverageInterval) {
                        total += Math.abs(inputData[i]);
                    }

                    var rms = Math.sqrt((kSampleAverageInterval * total) / inputDataLength);
                    _this._animateFillMeter(meterFillElem, rms);
                    
                    // Only send our rms data if we are not muted.
                    if (NavBar.micBtn.isSelected()) {
                        _broadcastRms(rms);
                    }
                }
            };
        }

        this._map[peerId] = {
            streamSource    : mediaStreamSource,
            processor       : processor,
            fillMeter       : meterFillElem,
            eventListenerId : eventListenerId
        };
    },

    /* Parameters:
     *   peerId : string
     *     Peer ID of the AudioMeter to destroy
     */
    destroy : function (peerId) {
        var item = this._map[peerId];
        if (item.streamSource !== null && item.processor !== null) {
            item.streamSource.disconnect(item.processor);
        }
        
        if (item.eventListenerId !== null) {
            NavBar.micBtn.removeToggleEventListener(item.eventListenerId);
        }

        delete this._map[peerId];
    }
};

window.AudioContext = (window.AudioContext || window.webkitAudioContext);
