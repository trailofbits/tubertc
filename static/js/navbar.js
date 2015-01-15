/* Defines the items and connects the logic of the navigation bar.
 *
 * Requires:
 *   js/error.js
 */

// Defines a normal button
var Button = function (id) {
    var idSel = $(id);

    this.id = id;
    this.clickFn = null;

    var _this = this;
    var _paintColor = function () {
        idSel.css('fill', '#cccccc');
    };
    
    /* Parameters:
     *   clickFn : function()
     *     Callback function that is called upon clicking the button
     */
    this.onClick = function (clickFn) {
        this.clickFn = clickFn;
    };

    idSel.hover(function () {
        idSel.css('opacity', '0.5');
    }, function () {
        idSel.css('opacity', '1');
    });
    
    idSel.click(function () {
        if (_this.clickFn !== null) {
            _this.clickFn();
        } else {
            ErrorMetric.log(id + '.click => Button.clickFn not defined');
        }

        idSel.blur();
    });

    _paintColor();

    return this;
};

// Defines a button that acts like a checkbox
var StatefulButton = function (id, enabled) {
    var idSel = $(id);

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
            idSel.css('fill', '#009966');
        } else {
            idSel.css('fill', '#cc0033');
        }
    };

    /* Toggles the state of the button and repaints the button's icon color
     */
    this.toggle = function () {
        if (this.enabled) {
            this.enabled = false;
        } else {
            this.enabled = true;
        }

        _paintColor();
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
        idSel.css('opacity', '0.5');
    }, function () {
        idSel.css('opacity', '1');
    });
    
    idSel.click(function () {
        _this.toggle();
        
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
