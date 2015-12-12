/**
 * @file Defines a class for sound clips such as those used
 * for notifying a user entering or leaving the chat.
 *
 * @requires module:js/error
 */

'use strict';

/**
 * Creates a sound clip.
 *
 * @param {AudioElement} elem - The audio element
 * containing the sound to control.
 * @returns {SoundClip} A new sound clip.
 * @class
 */
var SoundClip = function(elem) {
    var _queue = 0;

    /**
     * Plays the sound if the element is
     * paused, otherwise queues it up.
     *
     * @returns {undefined} undefined
     * @public
     */
    this.play = function() {
        if (elem.paused) {
            elem.play();
        } else {
            _queue++;
        }
    };

    /**
     * Registers an event handler for when the audio is
     * paused. This usually happens after playing a sound.
     *
     * @returns {undefined} undefined
     * @public
     */
    elem.onpause = function() {
        if (_queue > 0) {
            elem.play();
            _queue--;
        }
    };
};
