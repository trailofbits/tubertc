/**
 * @file Defines a namespace for modal dialogues.
 *
 * @see css/dialog.css and index.html (look for DIV.modalDialog*)
 * for HTML and CSS implementation details.
 *
 * @requires module:js/error
 */

'use strict';

// jQuery selectors
var _appPage = $('.appPage');
var _modalDialog = $('#modalDialog');
var _modalDialogClose = $('#modalDialogClose');
var _modalDialogRefresh = $('#modalDialogRefresh');

var Dialog = {
    // Stores a list of queued messages to display to the user
    _queued: [],

    /**
     * Sets the content in the modal dialog.
     *
     * @param {Object} config - Configuration object.
     * @returns {undefined} undefined
     * @private
     */
    _setDialogContent: function(config) {
        $('#modalDialogTitle').text(config.title);
        $('#modalDialogContent').html(config.content);

        if (config.forceRefresh !== undefined && config.forceRefresh) {
            _modalDialogClose.css('display', 'none');

            _modalDialogRefresh.css('display', 'initial');
            _modalDialogRefresh.click(function() {
                location.reload(true);
            });
        }

        _appPage.css('pointer-events', 'none');

        Dialog._centerVertically();
        _modalDialog.fadeIn();
    },

    /**
     * Centers the modal dialog vertically in the window.
     *
     * @returns {undefined} undefined
     * @private
     */
    _centerVertically: function() {
        // The subtract 15 comes from the padding property of #modalDialog
        var newTop = ($(window).height() / 2) - (_modalDialog.height() / 2) - 15;
        _modalDialog.css('top', newTop + 'px');
    },

    /**
     * Shows the dialog.
     *
     * @param {Object} config - Configuration object.
     * @param {String} config.title - The title of the modal dialog.
     * @param {String} config.content - Main HTML content of the modal dialog.
     * @param {Boolean} config.forceRefresh - For "fatal" error messages. Adds
     * a refresh button instead of a close dialog button.
     * @returns {undefined} undefined
     * @public
     */
    show: function(config) {
        if (config.title === undefined) {
            ErrorMetric.log('Dialog.show: config.title is undefined');
            return false;
        }

        if (config.content === undefined) {
            ErrorMetric.log('Dialog.show: config.content is undefined');
            return false;
        }

        var displayStatus = _modalDialog.css('display');
        if (displayStatus === 'block') {
            Dialog._queued.push(config);
        } else {
            this._setDialogContent(config);
        }
    }
};

// Handles closing the modal dialog.
_modalDialogClose.click(function() {
    if (Dialog._queued.length > 0) {
        // Fade out and in to denote a new message arrived
        _modalDialog.fadeOut(function() {
            var config = Dialog._queued.shift();
            Dialog._setDialogContent(config);
        });
    } else {
        _modalDialog.fadeOut();
        _appPage.css('pointer-events', 'auto');
    }
});

$(window).resize(function() {
    Dialog._centerVertically();
});
