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
        idSel
            .css('opacity', '0.3')
            .css('fill', _kDisabledColor);
    };

    this.enableButton = function () {
        _buttonIsEnabled = true;
        idSel
            .css('opacity', '1')
            .css('fill', _kDefaultColor);
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
var StatefulButton = function (id, selected) {
    var idSel = $(id);
    var _kSelectedColor = '#009966';
    var _kUnselectedColor = '#cc0033';
    var _buttonIsEnabled = true;

    this.id = id;
    this.selectedFn = null;
    this.unselectedFn = null;

    this.selected = selected;
    if (selected === undefined) {
        this.selected = false;
    }
    
    var _this = this;
    var _paintColor = function () {
        if (_this.selected) {
            idSel.css('fill', _kSelectedColor);
        } else {
            idSel.css('fill', _kUnselectedColor);
        }
    };
    
    this.disableButton = function () {
        _buttonIsEnabled = false;
        idSel
            .css('opacity', '0.3')
            .attr('title', 'Button is disabled');
    };
    
    this.isEnabled = function () {
        return _buttonIsEnabled;
    };

    this.enableButton = function () {
        _buttonIsEnabled = true;
        idSel
            .css('opacity', '1')
            .removeAttr('title');
    };

    this.clickButton = function () {
        idSel.click();
    };

    /* Toggles the state of the button and repaints the button's icon color
     */
    this.toggle = function () {
        if (_buttonIsEnabled) {
            if (this.selected) {
                this.selected = false;
            } else {
                this.selected = true;
            }

            _paintColor();
        }
    };
    
    /* Parameters:
     *   selectedFn  : function()
     *     Callback that is invoked when the button is clicked and the new state is SELECTED.
     *
     *   unselectedFn : function()
     *     Callback that is invoked when the button is clicked and the new state is UNSELECTED.
     */
    this.handle = function (selectedFn, unselectedFn) {
        this.selectedFn = selectedFn;
        this.unselectedFn = unselectedFn;
    };

    /* Returns the current state of the button
     */
    this.isSelected = function () {
        return this.selected; 
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
            if (_this.isSelected()) {
                if (_this.selectedFn !== null) {
                    _this.selectedFn();
                } else {
                    // FIXME: is this spamming my telemetry log?
                    ErrorMetric.log(id + '.click => StatefulButton.selectedFn not defined');
                }
            } else {
                if (_this.unselectedFn !== null) {
                    _this.unselectedFn();
                } else {
                    // FIXME: is this spamming my telemetry log?
                    ErrorMetric.log(id + '.click => StatefulButton.unselectedFn not defined');
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
