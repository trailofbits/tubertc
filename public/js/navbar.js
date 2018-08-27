/**
 * @file Defines the items and connects the logic of the navigation bar.
 *
 * @requires module:js/error
 */

'use strict';

/**
 * Defines a normal button.
 *
 * @param {String} id - CSS ID selector.
 * @class
 */
var Button = function(id) {
    var idSel = $(id);
    var _kDefaultColor = '#cccccc';
    var _kDisabledColor = '#404040';
    var _buttonIsEnabled = true;

    this.id = id;
    this.clickFn = null;

    var _this = this;

    /**
     * Fills the element with the default color.
     *
     * @returns {undefined} undefined
     * @private
     */
    var _paintColor = function() {
        idSel.css('fill', _kDefaultColor);
    };

    /**
     * Disables the button.
     *
     * @returns {undefined} undefined
     * @public
     */
    this.disableButton = function() {
        _buttonIsEnabled = false;
        idSel
            .css('opacity', '0.3')
            .css('fill', _kDisabledColor);
    };

    /**
     * Enables the button.
     *
     * @returns {undefined} undefined
     * @public
     */
    this.enableButton = function() {
        _buttonIsEnabled = true;
        idSel
            .css('opacity', '1')
            .css('fill', _kDefaultColor);
    };

    /**
     * Click handler.
     *
     * @param {Function} clickFn - Callback function
     * that is called upon clicking the button.
     * @returns {undefined} undefined
     * @public
     */
    this.onClick = function(clickFn) {
        this.clickFn = clickFn;
    };

    idSel.hover(function() {
        if (_buttonIsEnabled) {
            idSel.css('opacity', '0.5');
        }
    }, function() {
        if (_buttonIsEnabled) {
            idSel.css('opacity', '1');
        }
    });

    idSel.click(function() {
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

/**
 * Defines a button that acts like a checkbox.
 *
 * @param {String} id - CSS ID selector.
 * @param {Boolean} selected - True if selected,
 * false otherwise.
 * @class
 */
var StatefulButton = function(id, selected) {
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

    /**
     * Fills the element with the appropriate color.
     *
     * @returns {undefined} undefined
     * @private
     */
    var _paintColor = function() {
        if (_this.selected) {
            idSel.css('fill', _kSelectedColor);
        } else {
            idSel.css('fill', _kUnselectedColor);
        }
    };

    var _toggleCallbacks = {};
    var _currentToggleId = 0;

    /**
     * Invokes all toggle listener callbacks.
     *
     * @param {Boolean} newState - The new state
     * to provide to the callbacks.
     * @returns {undefined} undefined
     * @private
     */
    var _invokeToggleListenerCallbacks = function(newState) {
        for (var cb in _toggleCallbacks) {
            if (_toggleCallbacks.hasOwnProperty(cb)) {
                _toggleCallbacks[cb](newState);
            }
        }
    };

    /**
     * Adds a toggle event listener.
     *
     * @param {Function} handler - Callback function that gets
     * called on a toggle with the new state as the argument.
     * @returns {Number} The ID of the just registered event
     * listener callback (to be used with removeToggleEventListener).
     * @public
     */
    this.addToggleEventListener = function(handler) {
        _toggleCallbacks[_currentToggleId] = handler;
        return _currentToggleId++;
    };

    /**
     * Removes a toggle event listener.
     *
     * @param {Number} id - ID of the toggle
     * event listener to delete.
     * @returns {undefined} undefined
     * @public
     */
    this.removeToggleEventListener = function(id) {
        if (_toggleCallbacks[id] !== undefined) {
            delete _toggleCallbacks[id];
        } else {
            ErrorMetric.log('StatefulButton.removeToggleEventListener => bad id "' + id + '"');
        }
    };

    /**
     * Disables the button.
     *
     * @returns {undefined} undefined
     * @public
     */
    this.disableButton = function() {
        _buttonIsEnabled = false;
        idSel
            .css('opacity', '0.3')
            .attr('title', 'Button is disabled');
    };

    /**
     * Checks whether the button is enabled.
     *
     * @returns {Boolean} True if enabled,
     * false otherwise.
     * @public
     */
    this.isEnabled = function() {
        return _buttonIsEnabled;
    };

    /**
     * Enables the button.
     *
     * @returns {undefined} undefined
     * @public
     */
    this.enableButton = function() {
        _buttonIsEnabled = true;
        idSel
            .css('opacity', '1')
            .removeAttr('title');
    };

    /**
     * Clicks the button.
     *
     * @returns {undefined} undefined
     * @public
     */
    this.clickButton = function() {
        idSel.click();
    };

    /**
     * Toggles the state of the button and
     * repaints the button's icon color.
     *
     * @returns {undefined} undefined
     * @public
     */
    this.toggle = function() {
        if (_buttonIsEnabled) {
            if (this.selected) {
                this.selected = false;
            } else {
                this.selected = true;
            }

            _invokeToggleListenerCallbacks(this.selected);
            _paintColor();
        }
    };

    /**
     * Handler that registers functions for button
     * selection and deselection.
     *
     * @param {Function} selectedFn - Callback that
     * is invoked when the button is clicked and the
     * new state is SELECTED.
     * @param {Function} unselectedFn - Callback that
     * is invoked when the button is clicked and the
     * new state is UNSELECTED.
     * @returns {undefined} undefined
     * @public
     */
    this.handle = function(selectedFn, unselectedFn) {
        this.selectedFn = selectedFn;
        this.unselectedFn = unselectedFn;
    };

    /**
     * Returns the current state of the button.
     *
     * @returns {Boolean} True if selected,
     * false otherwise.
     * @public
     */
    this.isSelected = function() {
        return this.selected;
    };

    idSel.hover(function() {
        if (_buttonIsEnabled) {
            idSel.css('opacity', '0.5');
        }
    }, function() {
        if (_buttonIsEnabled) {
            idSel.css('opacity', '1');
        }
    });

    idSel.click(function() {
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
    cameraBtn: null,
    micBtn: null,
    dashBtn: null,
    attrBtn: null,

    /**
     * Initializes the navBar buttons.
     *
     * @returns {undefined} undefined
     * @public
     */
    initialize: function() {
        this.cameraBtn = new StatefulButton('#cameraBtn', true);
        this.micBtn = new StatefulButton('#micBtn', true);
        this.dashBtn = new StatefulButton('#dashBtn', true);
        this.attrBtn = new Button('#attrBtn');
    },

    /**
     * Fades in the navBar.
     *
     * @returns {undefined} undefined
     * @public
     */
    show: function() {
        $('.navBar').fadeIn();
    }
};
