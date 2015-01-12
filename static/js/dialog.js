/* Defines a namespace for modal dialogues. 
 *
 * See css/dialog.css and index.html (look for DIV.modalDialog*) for HTML
 * and CSS implementation details.
 */

var Dialog = {
    // Stores a list of queued messages to display to the user
    _queued : [],
    
    _setDialogContent : function (title, content) {
        $('#modalDialogTitle').text(title);
        $('#modalDialogContent').html(content);
    },

    /* Parameters:
     *   config - an Object that contains the following properties:
     *              title : String
     *                The title of the modal dialog
     *
     *              content : HTML
     *                The main content of the modal dialog
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

        var displayStatus = $('#modalDialog').css('display');
        if (displayStatus === 'block') {
            Dialog._queued.push(config);
        } else {
            this._setDialogContent(config.title, config.content);

            $('.appPage').css('pointer-events', 'none');
            
            $('#modalDialog').fadeIn();
        }
    }
};

$('#modalDialogClose').click(function () {
    if (Dialog._queued.length > 0) {
        // Fade out and in to denote a new message arrived
        $('#modalDialog').fadeOut(function () {
            var config = Dialog._queued.shift();
            Dialog._setDialogContent(config.title, config.content);

            $('#modalDialog').fadeIn();
        });
    } else {
        $('#modalDialog').fadeOut();
    
        $('.appPage').css('pointer-events', 'auto');
    }
});

$(window).resize(function () {
    var newTop = ($(window).height() / 2 - $('#modalDialog').height() / 2) + 'px';
    $('#modalDialog').css('top', newTop);
});
