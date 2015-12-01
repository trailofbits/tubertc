/* Handles and defines error handling functionality. Provides a mechanism
 * for reporting non-critical errors.
 */

// Provides a namespace for reporting error events.
var ErrorMetric = {
    // Provides configuration for where to send error telemetry data
    // TODO: actually implement the backend
    config: {
        telemetryUrl: '/telemetry'
    },

    /* Parameters:
     *   message : String
     *     A string representing a message of an error condition
     */
    log: function(message) {
        // TODO: using AJAX, post the message to config.telemetryUrl
        console.log('[error] ' + message);
    }
};

// Global error catcher that will pipe errors to a centralized databse
// TODO: send errors via AJAX to a database
$(window).error(function(e) {
    var evt = e.originalEvent;
    console.log('[error] ' + evt.filename + ':' + evt.lineno);
    console.log('[error]   ' + evt.message);
});
