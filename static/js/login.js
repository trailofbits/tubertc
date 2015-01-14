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
 *       and focus to direct user to the problematic field
 *   + Update localStorage fields with the new values.
 *
 * Requires:
 *   js/error.js
 *   js/navbar.js
 *   js/dialog.js
 */

var toRtcRoomName = function (roomName) {
    return roomName
            .replace(/[^\w\s]/gi, '')
            .replace(' ', '_');
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
     *     "userName"        : <string>,
     *     "cameraIsEnabled" : <bool>,
     *     "micIsEnabled"    : <bool>,
     *     "dashModeEnabled" : <bool>
     *   }
     */
    _validate : function (dict) {
        return (typeof dict.userName === 'string' && 
                typeof dict.cameraIsEnabled === 'boolean' &&
                typeof dict.micIsEnabled === 'boolean' &&
                typeof dict.dashModeEnabled === 'boolean');
    },

    set : function (config) {
        if (this._validate(config)) {
            localStorage.tubertc = JSON.stringify(config);
            return true;
        } else {
            ErrorMetric.log('StorageCookie.set => invalid Object structure');
            ErrorMetric.log('                  => ' + JSON.stringify(config));
            return false;
        }
    },
    
    /* Parameters:
     *   key : String
     *     Key part of the key-value pair.
     *
     *   value : *
     *     This value can be of any type and is returned whenever key is referenced.
     *
     *   This function assumes the existence of localStorage.tubertc. If it doesn't exist,
     *   it will fail. Otherwise, it will find the "key" in localStorage.tubertc and 
     *   update it to the new value.
     */
    setValue : function (key, value) {
        var config = this.get();
        if (config === null) {
            ErrorMetric.log('StorageCookie.setValue => StorageCookie.get had invalid return value');
            return false;
        } else {
            if (config[key] !== undefined) {
                ErrorMetric.log('StorageCookie.setValue => invalid key "' + key + '"');
                return false;
            } else {
                config[key] = value;
                return this.set(config);
            }
        }
    },

    /* DO NOT TRUST THE RETURNED OBJECT: The userName field needs to be sanitized.
     */
    get : function () {
        var rawConfig = localStorage.tubertc;
        if (rawConfig !== undefined) {
            // TODO: are we certain we can trust JSON.parse to parse localStorage?
            try {
                var config = JSON.parse(rawConfig);
                if (this._validate(config)) {
                    return config;
                } else {
                    ErrorMetric.log('StorageCookie.get => localStorage.tubertc Object is invalid');
                    ErrorMetric.log('                  => ' + JSON.stringify(config));
                    return null;
                }
            } catch (e) {
                ErrorMetric.log('StorageCookie.get => exception while trying to validate localStorage.tubertc');
                ErrorMetric.log('                  => ' + e);
                return null;
            }
        } else {
            ErrorMetric.log('StorageCookie.get => localStorage.tubertc does not exist');
            return null;
        }
    },

    /* DO NOT TRUST userName: it needs to be sanitized before use!
     */
    getValue : function (key) {
        var config = this.get();
        if (config !== null) {
            if (config[key] === undefined) {
                ErrorMetric.log('StorageCookie.getKey => invalid key "' + key + '"');
                return null;
            } else {
                return config[key];
            }
        } else {
            ErrorMetric.log('StorageCookie.getKey => StorageCookie.get had invalid return value');
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
                .html('Please provide a <b>user name</b>.')
                .stop(true, false)
                .slideDown();
            $('#userNameEntry').focus();
            return false;
        }

        if (roomName.length === 0) {
            $('#loginAlert')
                .html('Please provide a <b>room name</b>.')
                .stop(true, false)
                .slideDown();
            $('#roomNameEntry').focus();
            return false;
        }

        return true;
    },

    /* Parameters:
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
    initialize : function (config) {
        var _this = this;
        if (typeof config.cameraBtn !== 'object' ||
            typeof config.micBtn !== 'object' ||
            typeof config.dashBtn !== 'object') {
            ErrorMetric.log('Log.initialize => config parameter is not valid');
            ErrorMetric.log('               => config.cameraBtn is ' + config.cameraBtn);
            ErrorMetric.log('               => config.micBtn is ' + config.micBtn);
            ErrorMetric.log('               => config.dashBtn is ' + config.dashBtn);

            // Break chaining to indicate error
            return null;
        }

        var userName = StorageCookie.getValue('userName');
        var roomName = Query.getRoomName();

        if (userName !== null) {
            // TODO: verify that this doesn't introduce XSS
            $('#userNameEntry').val(userName);
        }

        if (roomName !== null) {
            $('#roomNameEntry')
                .val(roomName)
                .prop('disabled', true);
        }
    
        $('#userNameEntry').keypress(function (e) {
            // Detect when ENTER button is pressed
            if (e.which === 13) {
                if (roomName !== null) {
                    // Room is already populated from query string, simulate a click event
                    $('#joinBtn').click();
                } else {
                    // Room is not populated, switch focus to roomNameEntry
                    $('#roomNameEntry').focus();
                }
            }
        });

        $('#roomNameEntry').keypress(function (e) {
            // Detect when ENTER button is pressed
            if (e.which === 13) {
                $('#joinBtn').click();
            }
        });

        $('#joinBtn').click(function () {
            if (_this._validate()) {
                $('#loginAlert')
                    .stop(true, false)
                    .slideUp();
                
                var params = {
                    userName        : $('#userNameEntry').val(),
                    roomName        : $('#roomNameEntry').val(),
                    rtcName         : toRtcRoomName(roomName),
                    cameraIsEnabled : config.cameraBtn.isEnabled(),
                    micIsEnabled    : config.micBtn.isEnabled(),
                    dashIsEnabled   : config.dashBtn.isEnabled()
                };

                var trtcConfig = {
                    userName        : params.userName,
                    cameraIsEnabled : params.cameraIsEnabled,
                    micIsEnabled    : params.micIsEnabled,
                    dashModeEnabled : params.dashIsEnabled
                };
                StorageCookie.set(trtcConfig);

                if (_this._completionFn !== null) {
                    $('#loginContent').fadeOut(function () {
                        _this._completionFn(params);
                    });
                } else {
                    ErrorMetric.log('joinBtn.click => _completionFn not set');
                    
                    // FIXME: this case should not happen since we immediately call
                    //        done() to set the completion handler
                    Dialog.show('An Error Has Occurred', 'tubertc has broke!');
                }
            } else {
                ErrorMetric.log('joinBtn.click => failed to validate');
            }
        });

        return this;
    },

    /* Parameters:
     *   completionFn : function({
     *                    userName        : <String>,
     *                    roomName        : <String>,
     *                    rtcName         : <String>,
     *                    cameraIsEnabled : <boolean>,
     *                    micIsEnabled    : <boolean>,
     *                    dashModeEnabled : <boolean>
     *                  }) 
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
