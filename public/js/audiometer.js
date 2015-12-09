/**
 * @file Defines the audio meter that measures
 * audio activity for each WebRTC MediaStream.
 *
 * @requires module:js/error
 * @requires module:js/navbar
 *
 * This is currently an experimental feature that can be enabled/disabled.
 *
 * Because of problems with Chrome's WebAudio/WebRTC implementation, we are
 * currently using socket.io to alert the other callers of our sound state.
 * @see https://code.google.com/p/chromium/issues/detail?id=121673
 */

'use strict';

// This specifies how many audio samples to process at once. This must be a power of 2 with
// the maximum amount of samples at 16384. The bigger the buffer, the less often onaudioprocess
// is triggered. However, there will be more events to go through.
var kSampleSize = 16384;

// How often we take a sample.
var kSampleAverageInterval = 16;

// Threshold for when to broadcast noise levels
var kBroadcastRMSThreshold = 0.08;

var AudioMeter = {
    // Stores a mapping of peerId with objects needed to update and teardown associated items
    _map: {},

    // This will be set when init() is called and should be non-null
    _client: null,

    /**
     * Animates the fill meter.
     *
     * @param {Object} fillMeter - Fill meter object
     * (a `<div>` element).
     * @param {Number} rms - Root mean square (measure
     * of audio power).
     * @returns {undefined} undefined
     * @private
     */
    _animateFillMeter: function(fillMeter, rms) {
        fillMeter
            .stop()
            .animate({
                width: (rms * 100) + '%'
            }, 250,
            function() {
                // Make the meter "bounce" back to 0
                fillMeter
                    .stop()
                    .animate({
                        width: '0%'
                    }, 250);
            });
    },

    /**
     * Initializes the audio meter.
     *
     * @param {Object} client - VTCClient object of
     * the current WebRTC session.
     * @returns {undefined} undefined
     * @public
     */
    init: function(client) {
        this._client = client;
    },

    /**
     * Handles the peer message.
     *
     * @param {String} peerId - Peer ID that sent
     * the associated message.
     * @param {Object} content - Contains the decibel
     * percentage for use with populating the "width"
     * property of a `<div>` element:
     *
     *    content: {
     *        rms : float
     *    }
     *
     * @returns {undefined} undefined
     * @public
     */
    handlePeerMessage: function(peerId, content) {
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

    /**
     * Creates a new AudioMeter for the MediaStream for
     * a given peerId.
     *
     * @param {String} peerId - Peer ID of the provided
     * MediaStream object.
     * @param {Object} stream - MediaStream instance containing
     * the audio and video information of the user.
     * @param {Object} meterFillElem - HTML `<div>` element
     * representing the decibel amount (0 to 100%)
     * @param {Boolean} isLocalStream - True if the AudioMeter
     * to be created is for the local stream, false otherwise.
     * @returns {undefined} undefined
     * @public
     */
    create: function(peerId, stream, meterFillElem, isLocalStream) {
        var _this = this;
        var audioContext = null;
        var mediaStreamSource = null;
        var processor = null;
        var eventListenerId = null;

        var _broadcastRms = function(rms) {
            _this._client.sendPeerMessage({
                room: _this._client.getRoomName()
            }, 'audio-meter', {
                rms: rms
            });
        };

        if (isLocalStream !== undefined && isLocalStream) {
            audioContext = new AudioContext();
            mediaStreamSource = audioContext.createMediaStreamSource(stream);
            processor = audioContext.createScriptProcessor(kSampleSize, 1, 1);

            mediaStreamSource.connect(processor);
            processor.connect(audioContext.destination);

            processor.onaudioprocess = function(evt) {
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
                    if (NavBar.micBtn.isSelected() && rms > kBroadcastRMSThreshold) {
                        _broadcastRms(rms);
                    }
                }
            };
        }

        this._map[peerId] = {
            streamSource: mediaStreamSource,
            processor: processor,
            fillMeter: meterFillElem,
            eventListenerId: eventListenerId
        };
    },

    /**
     * Destroys the AudioMeter associated
     * with the provided Peer ID.
     *
     * @param {String} peerId - The peer ID of
     * the AudioMeter to destroy.
     * @returns {undefined} undefined
     * @public
     */
    destroy: function(peerId) {
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
