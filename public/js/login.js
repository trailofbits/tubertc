/**
 * @file This handles the following:
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
 * @requires module:js/error
 * @requires module:js/navbar
 * @requires module:js/dialog
 * @requires module:js/vtc
 * @requires Chance.js
 */

'use strict';

/**
 * Generates a random room name.
 *
 * @returns {String} A random room name.
 * @public
 */
var generateRoomName = function() {
    return chance.word() + '-' + chance.hash().substring(0, 8);
};

/**
 * Converts a room name to an RTC room name.
 *
 * @param {String} roomName - The room name.
 * @returns {String} A room name suitable for RTC.
 * @public
 */
var toRtcRoomName = function(roomName) {
    return roomName
            .replace(/[^\w\s]/gi, '')
            .replace(/ /gi, '_');
};

// Provides a namespace to parse the room name from the querystring
var Query = {
    /**
     * Gets a room name.
     * DO NOT TRUST OUTPUT FROM THIS FUNCTION
     *
     * @returns {String} The room name.
     * @public
     */
    getRoomName: function() {
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
    // The Object structure for our StorageCookie should look like the dictionary below:
    //   {
    //     "userName"        : <string>,
    //     "cameraIsEnabled" : <bool>,
    //     "micIsEnabled"    : <bool>,
    //     "dashModeEnabled" : <bool>
    //   }

    /**
     * Validates the StorageCookie.
     *
     * @param {Object} dict - StorageCookie configuration object.
     * @returns {Boolean} True if valid, false otherwise.
     * @private
     */
    _validate: function(dict) {
        return (typeof dict.userName === 'string' &&
                typeof dict.cameraIsEnabled === 'boolean' &&
                typeof dict.micIsEnabled === 'boolean' &&
                typeof dict.dashModeEnabled === 'boolean');
    },

    /**
     * Sets the StorageCookie.
     *
     * @param {Object} config - StorageCookie configuration object.
     * @returns {Boolean} True if successful, false otherwise.
     * @public
     */
    set: function(config) {
        if (this._validate(config)) {
            localStorage.tubertc = JSON.stringify(config);
            return true;
        } else {
            ErrorMetric.log('StorageCookie.set => invalid Object structure');
            ErrorMetric.log('                  => ' + JSON.stringify(config));
            return false;
        }
    },

    /**
     * Sets a value on the storage cookie. This function assumes the
     * existence of `localStorage.tubertc`. If it doesn't exist, it will
     * fail. Otherwise, it will find the "key" in `localStorage.tubertc`
     * and update it to the new value.
     *
     * @param {String} key - Key part of the key-value pair.
     * @param {*} value - This value can be of any type and
     * is returned whenever key is referenced.
     * @returns {Boolean} True if successful, false otherwise.
     * @public
     */
    setValue: function(key, value) {
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

    /**
     * Gets the StorageCookie.
     * DO NOT TRUST THE RETURNED OBJECT: The userName field needs to be sanitized.
     *
     * @returns {Object} The StorageCookie dict if successful, `null` otherwise.
     * @public
     */
    get: function() {
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

    /**
     * Gets the value associated with the key.
     * DO NOT TRUST userName: it needs to be sanitized before use!
     *
     * @param {String} key - The key to look up.
     * @returns {*} The value associated with the key, or `null`
     * if either the key is invalid or `StorageCookie.get()` fails.
     * @public
     */
    getValue: function(key) {
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

// jQuery selectors
var _joinBtn = $('#joinBtn');
var _loginMsg = $('#loginMsg');
var _loginAlert = $('#loginAlert');
var _userNameEntry = $('#userNameEntry');
var _roomNameEntry = $('#roomNameEntry');

var Login = {
    _completionFn: null,

    /**
     * Checks to ensure that the current browser has
     * the support needed to successfully use tubertc.
     *
     * @returns {String|null} The return status value. It has three possible
     * states, which mean the following:
     * 'full'     - All APIs are supported and browser is well tested
     * 'untested' - All APIs are supported but browser is not as well tested
     * null       - Some required APIs are not supported
     * @private
     */
    _browserCompatCheck: function() {
        var userAgent = navigator.userAgent;

        if (!('Notification' in window)) {
            ErrorMetric.log('_browserCompatCheck => browser does not support Notifications');
            ErrorMetric.log('                    => userAgent: ' + userAgent);

            return null;
        }

        if (!('localStorage' in window)) {
            ErrorMetric.log('_browserCompatCheck => browser does not support LocalStorage');
            ErrorMetric.log('                    => userAgent: ' + userAgent);

            return null;
        }

        if (!VTCCore.isBrowserSupported()) {
            ErrorMetric.log('_browserCompatCheck => browser does not support WebRTC');
            ErrorMetric.log('                    => userAgent: ' + userAgent);

            return null;
        }

        // @todo FIXME: We only have tested Chrome, need to refactor this once more browsers are tested
        if ('chrome' in window) {
            // Check to see if we need to display 'ssl' warning by determining that the visitor is browsing
            // a non-TLS site with a Chrome browser version of 47 and above
            if (window.location.protocol !== 'https:' && 
                (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')) {
                var browserString = null;
                var browserVersion = null;
                var browserVersionString = null;
                var browserStartIdx = userAgent.indexOf('Chrome/');
                if (browserStartIdx === -1) {
                    browserStartIdx = userAgent.indexOf('Chromium/');
                }
                if (browserStartIdx === -1) {
                    // Could not find Chrome or Chromium in user agent...
                    // At this point, we should assume that it might be newer than 47
                    return 'ssl';
                }
                var browserEndIdx = userAgent.indexOf(' ', browserStartIdx);
                if (browserEndIdx === -1) {
                    browserString = userAgent.substring(browserStartIdx);
                } else {
                    browserString = userAgent.substring(browserStartIdx, browserEndIdx);
                }
                browserVersionString = browserString.split('/')[1];
                if (browserVersionString.indexOf('.') !== -1) {
                    browserVersion = parseInt(browserVersionString.split('.')[0], 10);
                } else {
                    browserVersion = parseInt(browserVersionString);
                }

                // Chrome/Chromium 47 introduces a policy requiring SSL for getUserMedia requests to
                // work correctly.
                if (browserVersion >= 47) {
                    return 'ssl';
                }
            }
            return 'full';
        } else {
            return 'untested';
        }
    },

    /**
     * Validates the user and room names.
     *
     * @returns {Boolean} True if user name and
     * room name are valid, false otherwise.
     * @private
     */
    _validate: function() {
        var userName = $.trim(_userNameEntry.val());
        var roomName = $.trim(_roomNameEntry.val());

        if (userName.length === 0) {
            _loginAlert
                .html('Please provide a <b>user name</b>.')
                .stop(true, false)
                .slideDown();
            _userNameEntry.focus();
            return false;
        }

        if (roomName.length === 0) {
            _loginAlert
                .html('Please provide a <b>room name</b>.')
                .stop(true, false)
                .slideDown();
            _roomNameEntry.focus();
            return false;
        }

        return true;
    },

    /**
     * Sets up the handlers for the initial "page" form.
     *
     * @param {Object} config - Configuration object of the form:
     * {
     *     cameraBtn : <StatefulButton>,
     *     micBtn    : <StatefulButton>,
     *     dashBtn   : <StatefulButton>
     * }
     *
     * @returns {Object} The current Login instance for chaining purposes.
     * @public
     */
    initialize: function(config) {
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

        var compatStatus = this._browserCompatCheck();
        if (compatStatus === null) {
            _userNameEntry.prop('disabled', true);
            _roomNameEntry.prop('disabled', true);
            _joinBtn.prop('disabled', true);

            // @todo FIXME: proofread and make this better
            _loginAlert
                .html(
                    'Your browser <b>does not</b> support some of the required APIs.<br>' +
                    'tubertc will not work on your current system.<br><br>' +
                    'We recommend using <a href="http://www.google.com/chrome/">Google Chrome</a>.'
                )
                .slideDown();

            // Disable buttons since the app is disabled anyways.
            config.cameraBtn.disableButton();
            config.micBtn.disableButton();
            config.dashBtn.disableButton();

            ErrorMetric.log('Login.initialize => ' + navigator.userAgent + ' is not supported');

            // Break chaining to indicate error
            return null;
        } else if (compatStatus === 'untested') {
            // @todo FIXME: proofread and make this better
            _loginAlert
                .html(
                    'Your browser configuration has not been extensively tested. ' +
                    'There may be user interface artifacts or missing functionality.<br><br>' +
                    'We recommend using <a href="http://www.google.com/chrome/">Google Chrome</a>.'
                )
                .slideDown();
            ErrorMetric.log('Login.initialize => ' + navigator.userAgent + ' is untested');
        } else if (compatStatus === 'ssl') {
            // @todo FIXME: proofread and make this better
            _loginAlert
                .html(
                    'Starting with Chrome 47 and higher, WebRTC will cease to function on non-TLS sites.'
                )
                .slideDown();
            ErrorMetric.log('Login.initialize => ' + navigator.userAgent + ' requires SSL for getUserMedia ' +
                            'to work');
        }

        var userName = StorageCookie.getValue('userName');
        var roomName = Query.getRoomName();

        if (userName !== null) {
            // @todo Verify that this doesn't introduce XSS
            _userNameEntry.val(userName);
        }

        if (roomName !== null) {
            _roomNameEntry
                .val(roomName)
                .prop('disabled', true);
        } else {
            // No roomName was specified, to make it friendly to the user, generate one.
            // We don't set roomName because we want to make this field modifiable.
            _roomNameEntry
                .val(generateRoomName());
        }

        var scCameraEnabled = StorageCookie.getValue('cameraIsEnabled');
        var scMicEnabled = StorageCookie.getValue('micIsEnabled');
        var scDashMode = StorageCookie.getValue('dashModeEnabled');
        var _setInitialBtnState = function(initValue, btn) {
            if (initValue !== null && initValue !== btn.isSelected()) {
                btn.toggle();
            }
        };

        // Set button's initial state (from localStorage)
        _setInitialBtnState(scCameraEnabled, config.cameraBtn);
        _setInitialBtnState(scMicEnabled, config.micBtn);
        _setInitialBtnState(scDashMode, config.dashBtn);

        // Obtain the list of video sources, if none exist, disable the camera button
        easyrtc.getVideoSourceList(function(list) {
            if (list.length === 0) {
                _setInitialBtnState(false, config.cameraBtn);
                config.cameraBtn.disableButton();

                // @todo FIXME: maybe add a different sort of notification, like a tooltip?
                _loginMsg
                    .html('Disabling camera because not a camera could be found.')
                    .slideDown();
            }
        });

        _userNameEntry.keypress(function(e) {
            // Detect when ENTER button is pressed
            if (e.which === 13) {
                if (roomName !== null) {
                    // Room is already populated from query string, simulate a click event
                    _joinBtn.click();
                } else {
                    // Room is not populated, switch focus to roomNameEntry
                    _roomNameEntry.focus();
                }
            }
        });

        _roomNameEntry.keypress(function(e) {
            // Detect when ENTER button is pressed
            if (e.which === 13) {
                _joinBtn.click();
            }
        });

        _joinBtn.click(function() {
            if (_this._validate()) {
                _loginAlert
                    .stop(true, false)
                    .slideUp();

                var params = {
                    userName: _userNameEntry.val(),
                    roomName: _roomNameEntry.val(),
                    rtcName: toRtcRoomName(_roomNameEntry.val()),
                    cameraIsEnabled: config.cameraBtn.isSelected(),
                    hasCamera: config.cameraBtn.isEnabled(),
                    micIsEnabled: config.micBtn.isSelected(),
                    hasMic: config.micBtn.isEnabled(),
                    dashIsEnabled: config.dashBtn.isSelected()
                };

                var trtcConfig = {
                    userName: params.userName,
                    cameraIsEnabled: params.cameraIsEnabled,
                    micIsEnabled: params.micIsEnabled,
                    dashModeEnabled: params.dashIsEnabled
                };
                StorageCookie.set(trtcConfig);

                if (_this._completionFn !== null) {
                    $('#loginContent').fadeOut(function() {
                        _this._completionFn(params);
                    });
                } else {
                    ErrorMetric.log('joinBtn.click => _completionFn not set');

                    // @todo FIXME: this case should not happen since we immediately call
                    //              done() to set the completion handler
                    Dialog.show('An Error Has Occurred', 'tubertc has broke!');
                }
            } else {
                ErrorMetric.log('joinBtn.click => failed to validate');
            }
        });

        return this;
    },

    /**
     * Completion handler, called when the "Join Room" button is clicked and all the input is validated.
     * At this point, both the userName and roomName are considered UNTRUSTED and should be sanitized
     * using Handlebars.
     *
     * @param {Function} completionFn - Completion callback of the form:
     * function({
     *     userName        : <String>,
     *     roomName        : <String>,
     *     rtcName         : <String>,
     *     cameraIsEnabled : <boolean>,
     *     hasCamera       : <boolean>,
     *     micIsEnabled    : <boolean>,
     *     hasMic          : <boolean>,
     *     dashModeEnabled : <boolean>
     * })
     * @returns {Object} The current Login instance for chaining purposes.
     * @public
     */
    done: function(completionFn) {
        this._completionFn = completionFn;
        return this;
    }
};
