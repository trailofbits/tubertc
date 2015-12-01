/* Defines the clock item in the navbar.
 *
 * Requires:
 *  js/error.js
 */

var twoDigitNum = function(num) {
    var out = '' + num;
    if (out.length == 1) {
        out = '0' + out;
    }
    return out;
};

var Clock = {
    UPDATE_INTERVAL: 5, /* update very 5 seconds */

    timeLabel: $('#timeLabel'),

    initialize: function() {
        this.update();
    },

    update: function() {
        var obj = this;
        var date = new Date();
        var timeString = twoDigitNum(date.getHours()) + ':' + twoDigitNum(date.getMinutes());
        obj.timeLabel.text(timeString);
        setTimeout(function() {
            obj.update();
        }, this.UPDATE_INTERVAL * 1000);
    }
};
