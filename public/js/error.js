/**
 * @file Handles and defines error handling functionality.
 * Provides a mechanism for reporting non-critical errors.
 */

'use strict';

/**
 * Provides a namespace for reporting error events.
 *
 * @class
 */
var ErrorMetric = {
    // Provides configuration for where to send error telemetry data
    // @todo Actually implement the backend
    config: {
        telemetryUrl: '/telemetry'
    },

    /**
     * Wraps the native `console.log()` function.
     *
     * @param {String} message - A string representing a message
     * of an error condition
     * @returns {undefined} undefined
     * @public
     */
    log: function(message) {
        // @todo Using AJAX, post the message to config.telemetryUrl
        console.log('[error] ' + message);
    }
};

// Global error catcher that will pipe errors to a centralized database
// @todo Send errors via AJAX to a database
$(window).error(function(e) {
    var evt = e.originalEvent;
    console.log('[error] ' + evt.filename + ':' + evt.lineno);
    console.log('[error]   ' + evt.message);
});
