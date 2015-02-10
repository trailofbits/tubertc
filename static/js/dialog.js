/* Defines a namespace for modal dialogues. 
 *
 * See css/dialog.css and index.html (look for DIV.modalDialog*) for HTML
 * and CSS implementation details.
 *
 * Requires:
 *   js/error.js
 */

// jQuery selectors
var _appPage = $('.appPage');
var _modalDialog = $('#modalDialog');
var _modalDialogClose = $('#modalDialogClose');
var _modalDialogRefresh = $('#modalDialogRefresh');

var Dialog = {
    // Stores a list of queued messages to display to the user
    _queued : [],
    
    _setDialogContent : function (config) {
        $('#modalDialogTitle').text(config.title);
        $('#modalDialogContent').html(config.content);
        
        if (config.forceRefresh !== undefined && config.forceRefresh) {
            _modalDialogClose.css('display', 'none');

            _modalDialogRefresh.css('display', 'initial');
            _modalDialogRefresh.click(function () {
                location.reload(true);
            });
        }

        _appPage.css('pointer-events', 'none');

        Dialog._centerVertically();
        _modalDialog.fadeIn();
    },
    
    _centerVertically : function () {
        // The subtract 15 comes from the padding property of #modalDialog
        var newTop = ($(window).height() / 2) - (_modalDialog.height() / 2) - 15;
        _modalDialog.css('top', newTop + 'px');
    },

    /* Parameters:
     *   config - an Object that contains the following properties:
     *              title : String
     *                The title of the modal dialog
     *
     *              content : HTML
     *                The main content of the modal dialog
     *
     *              forceRefresh : boolean
     *                This is for "fatal" error messages and adds a refresh button instead
     *                of a close dialog button.
     */
    show: function (config) {
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

_modalDialogClose.click(function () {
    if (Dialog._queued.length > 0) {
        // Fade out and in to denote a new message arrived
        _modalDialog.fadeOut(function () {
            var config = Dialog._queued.shift();
            Dialog._setDialogContent(config);
        });
    } else {
        _modalDialog.fadeOut();
    
        _appPage.css('pointer-events', 'auto');
    }
});

$(window).resize(function () {
    Dialog._centerVertically();
});
