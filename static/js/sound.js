/* Defines a class for sound clips such as those used for notifying an user entering
 * or leaving the chat.
 *
 * Requires:
 *   js/error.js
 */

/* Parameters:
 *   elem : AudioElement
 *     The audio element containing the sound to control
 */
var SoundClip = function (elem) {
    var _queue = 0;
    
    // Either plays the sound or queues it up
    this.play = function () {
        if (elem.paused) {
            elem.play();
        } else {
            _queue++;
        }        
    };
    
    // Registers an event handler for when the audio is paused. This usually happens
    // after playing a sound.
    elem.onpause = function () {
        if (_queue > 0) {
            elem.play();
            _queue--;
        }
    };
};
