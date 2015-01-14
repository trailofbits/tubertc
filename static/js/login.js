/* This handles the following:
 *   + Parsing of the query string for a roomName (if it exists)
 *   + Checking localStorage to determine the following information:
 *     - Is a userName key set with a valid value? If so, autopopulate the username field with this
 *       value.
 *     - Is a capabilities key set with valid values? If so, alter the navBar buttons to reflect the
 *       capabilities values. Valid capabilities:
 *        = cameraIsEnabled : bool
 *        = micIsEnabled    : bool
 *        = dashModeEnabled : bool
 *     - Example:
 *       {
 *         "userName" : <string>,
 *         "cameraIsEnabled" : <bool>,
 *         "micIsEnabled"    : <bool>,
 *         "dashModeEnabled" : <bool>
 *       }
 *   + Bind the Join button with a handler that performs the following actions:
 *     - Verifies that userName and roomName are valid values, if not, use visual indication 
 *       and focus to direct user to problematic field
 *     - Maybe this class should take a "completed" callback which will be passed arguments for
 *       the userName, roomName, and capabilities for the next step.
 *     - Populate #roomName in index.html with the roomName
 */

var toRtcRoomName = function (roomName) {
    return roomName.replace(/[^\w\s]/gi, '');
};

// Provides a namespace to parse the room name from the querystring
var Query = {
    /* DO NOT TRUST OUTPUT FROM THIS FUNCTION
     */
    getRoomName : function () {
        var queryStart = '?room=';
        var queryRaw = document.location.search;
        if (queryRaw.length <= queryStart.length) {
            return null;
        }
        
        if (queryRaw.indexOf(queryStart) !== 0) {
            ErrorMetric.log('Query.getRoomName => Invalid querystring: ' + queryRaw);
            return null;
        }
        
        return unescape(queryRaw.substring(6));
    }
};

var StorageCookie = {
    /* The Object structure for our StorageCookie should look like the dictionary below:    
     *   {
     *     "userName" : <string>,
     *     "cameraIsEnabled" : <bool>,
     *     "micIsEnabled"    : <bool>,
     *     "dashModeEnabled" : <bool>
     *   }
     */
    _validate : function (dict) {
        return (typeof dict.userName === 'string' && 
                typeof dict.cameraIsEnabled === 'boolean' &&
                typeof dict.micIsEnabled === 'boolean' &&
                typeof dashModeEnabled === 'boolean');
    },

    set : function (config) {
        if (this._validate(config)) {
            localStorage.tubertc = config;
            return true;
        } else {
            ErrorMetric.log('StorageCookie.set => invalid Object structure');
            ErrorMetric.log('                  => ' + JSON.stringify(config));
            return false;
        }
    },
    
    /* DO NOT TRUST INPUT FROM THIS FUNCTION
     */
    get : function (key) {
        if (localStorage.tubertc !== undefined && this._validate(localStorage.tubertc)) {
            var config = localStorage.tubertc;
            if (config[key] === undefined) {
                ErrorMetric.log('StorageCookie.get => invalid key "' + key + '"');
                return null;
            } else {
                return config[key];
            }
        } else {
            ErrorMetric.log('StorageCookie.get => invalid localStorage.tubertc Object (might not exist)');
            ErrorMetric.log('                  => ' + JSON.stringify(localStorage.tubertc));
            return null;
        }
    }
};

var Login = {
    _completionFn : null,

    _validate : function () {
        var userName = $.trim($('#userNameEntry').val());
        var roomName = $.trim($('#roomNameEntry').val());

        if (userName.length === 0) {
            $('#loginAlert')
                .text('Please provide a user name.')
                .stop(true, false)
                .slideDown();
            $('#userNameEntry').focus();
            return false;
        }

        if (roomName.length === 0) {
            $('#loginAlert')
                .text('Please provide a room name.')
                .stop(true, false)
                .slideDown();
            $('#roomNameEntry').focus();
            return false;
        }

        return true;
    },

    /* BELOW IS TODO
     * Parameters:
     *   config : Object
     *     {
     *       cameraBtn : <StatefulButton>,
     *       micBtn    : <StatefulButton>,
     *       dashBtn   : <StatefulButton>
     *     }
     * Return:
     *   Login
     *     This returns itself for chaining purposes.
     *
     * This function is responsible for setting up the handlers for the initial "page" form.
     */
    initialize : function () {
        var _this = this;

        var userName = StorageCookie.get('userName');
        var roomName = Query.getRoomName();

        if (userName !== null) {
            // FIXME: verify that this doesn't introduce XSS
            $('#userNameEntry').val(userName);
        }

        if (roomName !== null) {
            $('#roomNameEntry')
                .val(roomName)
                .prop('disabled', true);
        }
    
        // TODO: add keypress handlers to #userNameEntry to detect ENTER and either submit form or tab to #roomNameEntry
        //       depending on whether or not roomName was already provided via querystring
        // TODO: add keypress handlers to #roomNameEntry to detect ENTER and simulate a joinBtn click event

        $('#joinBtn').click(function () {
            if (_this._validate()) {
                $('#loginAlert')
                    .stop(true, false)
                    .slideUp();
                
                // TODO: grab all capabilities information (from navBar...)
                // TODO: set localStorage with new userName and capabilities
                // TODO: is _completionFn not null?
                // TODO: pass localStorage and capabilities to callback function
                console.log('validated!');
            }
        });

        return this;
    },

    /* Parameters:
     *   completionFn : function(userName, roomName, cameraIsEnabled, micIsEnabled, dashModeEnabled) 
     *     This function is called when the "Join Room" button is clicked and all the input is validated.
     *     At this point, both the userName and roomName are considered UNTRUSTED and should be sanitized
     *     using Handlebars.
     *
     * Return:
     *   Login
     *     Returns itself for chaining purposes.
     */
    done : function (completionFn) {
        this._completionFn = completionFn;
        return this;
    }
};
