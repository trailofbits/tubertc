/* Defines the items and connects the logic of the navigation bar.
 *
 * Requires:
 *   js/error.js
 */

// Defines a normal button
var Button = function (id) {
    var idSel = $(id);
    var _kDefaultColor = '#cccccc';
    var _kDisabledColor = '#404040';
    var _buttonIsEnabled = true;

    this.id = id;
    this.clickFn = null;

    var _this = this;
    var _paintColor = function () {
        idSel.css('fill', _kDefaultColor);
    };
    
    this.disableButton = function () {
        _buttonIsEnabled = false;
        idSel.css('fill', _kDisabledColor);
    };

    this.enableButton = function () {
        _buttonIsEnabled = true;
        idSel.css('fill', _kDefaultColor);
    };

    /* Parameters:
     *   clickFn : function()
     *     Callback function that is called upon clicking the button
     */
    this.onClick = function (clickFn) {
        this.clickFn = clickFn;
    };

    idSel.hover(function () {
        if (_buttonIsEnabled) {
            idSel.css('opacity', '0.5');
        }
    }, function () {
        if (_buttonIsEnabled) {
            idSel.css('opacity', '1');
        }
    });
    
    idSel.click(function () {
        if (_buttonIsEnabled) {
            if (_this.clickFn !== null) {
                _this.clickFn();
            } else {
                ErrorMetric.log(id + '.click => Button.clickFn not defined');
            }
        }

        idSel.blur();
    });

    _paintColor();

    return this;
};

// Defines a button that acts like a checkbox
var StatefulButton = function (id, enabled) {
    var idSel = $(id);
    var _kEnableColor = '#009966';
    var _kDisableColor = '#cc0033';
    var _buttonIsEnabled = true;

    this.id = id;
    this.enabledFn = null;
    this.disabledFn = null;

    this.enabled = enabled;
    if (enabled === undefined) {
        this.enabled = false;
    }
    
    var _this = this;
    var _paintColor = function () {
        if (_this.enabled) {
            idSel.css('fill', _kEnableColor);
        } else {
            idSel.css('fill', _kDisableColor);
        }
    };
    
    this.disableButton = function () {
        _buttonIsEnabled = false;
        idSel.attr('title', 'Button is disabled');
    };

    this.enableButton = function () {
        _buttonIsEnabled = true;
        idSel.removeAttr('title');
    };

    /* Toggles the state of the button and repaints the button's icon color
     */
    this.toggle = function () {
        if (_buttonIsEnabled) {
            if (this.enabled) {
                this.enabled = false;
            } else {
                this.enabled = true;
            }

            _paintColor();
        }
    };
    
    /* Parameters:
     *   enabledFn  : function()
     *     Callback that is invoked when the button is clicked and the new state is ENABLED.
     *
     *   disabledFn : function()
     *     Callback that is invoked when the button is clicked and the new state is DISABLED.
     */
    this.handle = function (enabledFn, disabledFn) {
        this.enabledFn = enabledFn;
        this.disabledFn = disabledFn;
    };

    /* Returns the current state of the button
     */
    this.isEnabled = function () {
        return this.enabled; 
    };

    idSel.hover(function () {
        if (_buttonIsEnabled) {
            idSel.css('opacity', '0.5');
        }
    }, function () {
        if (_buttonIsEnabled) {
            idSel.css('opacity', '1');
        }
    });
    
    idSel.click(function () {
        _this.toggle();
        
        if (_buttonIsEnabled) {
            if (_this.isEnabled()) {
                if (_this.enabledFn !== null) {
                    _this.enabledFn();
                } else {
                    // FIXME: is this spamming my telemetry log?
                    ErrorMetric.log(id + '.click => StatefulButton.enabledFn not defined');
                }
            } else {
                if (_this.disabledFn !== null) {
                    _this.disabledFn();
                } else {
                    // FIXME: is this spamming my telemetry log?
                    ErrorMetric.log(id + '.click => StatefulButton.disabledFn not defined');
                }
            }
        }

        idSel.blur();
    });

    _paintColor();
    
    return this;
};

var NavBar = {
    cameraBtn : null,
    micBtn    : null,
    dashBtn   : null,
    attrBtn   : null,

    // Initializes the navBar buttons
    initialize : function () {
        this.cameraBtn = new StatefulButton('#cameraBtn', true);
        this.micBtn = new StatefulButton('#micBtn', true);
        this.dashBtn = new StatefulButton('#dashBtn');
        this.attrBtn = new Button('#attrBtn');
    },

    // Fades in the navBar
    show : function () {
        $('.navBar').fadeIn();
    }
};
