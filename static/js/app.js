/* Defines the main tubertc application logic.
 */

/* Replace all SVG images in the ".navBar" with inline SVGs so that we can style SVG elements
 * using CSS. This function also takes a completion function to execute after completion of
 * SVG inlining.
 *
 * (see http://stackoverflow.com/questions/11978995/how-to-change-color-of-svg-image-using-css-jquery-svg-image-replacement)
 */
var svgToInlineSvg = function (completionFn) {
    var deferredObjs = [];

    $('img.svg').each(function () {
        var $img = jQuery(this);
        var imgID = $img.attr('id');
        var imgClass = $img.attr('class');
        var imgURL = $img.attr('src');

        deferredObjs.push(jQuery.get(imgURL, function (data) {
            var $svg = jQuery(data).find('svg');
            if (typeof imgID !== 'undefined') {
                $svg = $svg.attr('id', imgID);
            }
            if (typeof imgClass !== 'undefined') {
                $svg = $svg.attr('class', imgClass + ' replaced-svg');
            }
            $svg = $svg.removeAttr('xmlns:a');
            $img.replaceWith($svg);
        }, 'xml'));
    });

    // Wait for all the AJAX operations to finish before we call the "finished" callback
    $.when.apply($, deferredObjs).done(function () {
        if (completionFn !== undefined) {
            completionFn();
        }
    });    
};


// Main entry point
$(document).ready(function () {
    svgToInlineSvg(function () {
        NavBar.initialize();
        Login
            .initialize()
            .done(function () {

            });
    });
});
