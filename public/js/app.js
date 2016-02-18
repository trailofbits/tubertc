/**
 * @file Defines the main tubertc application logic.
 *
 * @requires module:js/navbar
 * @requires module:js/login
 * @requires module:js/dialog
 * @requires module:js/room
 * @requires Handlebars.js
 */

'use strict';

/**
 * Replaces all SVG images in the ".navBar" with inline SVGs that we
 * can style SVG elements using CSS.
 *
 * @see http://stackoverflow.com/questions/11978995/how-to-change-color-of-svg-image-using-css-jquery-svg-image-replacement)
 *
 * @param {Function} completionFn - A completion function to execute
 * after completion of SVG inlining.
 * @returns {undefined} undefined
 */
var svgToInlineSvg = function(completionFn) {
    var deferredObjs = [];

    $('img.svg').each(function() {
        var $img = jQuery(this);
        var imgID = $img.attr('id');
        var imgClass = $img.attr('class');
        var imgURL = $img.attr('src');

        deferredObjs.push(jQuery.get(imgURL, function(data) {
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
    $.when.apply($, deferredObjs).done(function() {
        if (completionFn !== undefined) {
            completionFn();
        }
    });
};

// The "About" dialog template
var attrDialogTmpl = Handlebars.compile(
    // @todo Add some blob of text/image here
    // @todo FIXME: modify attribution information here
    // @todo Check the LICENSE for each of the used frameworks to figure out if there
    //       are any instances of being not compliant
    '<div style="text-align: center">' +
    '  <img style="width: 176px; height: 203px;" src="/images/about_tubertc.svg" alt="[about]">' +
    '</div>' +
    '<ul>' +
    '<li>Icons made by: <a href="http://www.icons8.com" title="Icons8">Icons8</a>, <a href="http://www.icomoon.io" title="Icomoon">Icomoon</a>, <a href="http://www.freepik.com" title="Freepik">Freepik</a>, and <a href="http://yanlu.de" title="Yannick">Yannick</a> from <a href="http://www.flaticon.com" title="Flaticon">www.flaticon.com</a> is licensed under <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0">CC BY 3.0</a></li>' +
    '<li>Using <a href="http://soundbible.com/2067-Blop.html">Blop</a> by Mark Dingelo which is licensed under <a href="https://creativecommons.org/licenses/by/3.0/legalcode" title="Attribution 3.0">Attribution 3.0</a></li>' +
    '<li>Using the <a href="http://mincss.com/">Min</a> CSS framework</li>' +
    '<li>Using <a href="http://handlebarsjs.com/">handlebars</a> for templating</li>' +
    '<li>Using <a href="http://chancejs.com/">Chance</a> for generating random room names</li>' +
    '<li>Using adapted <a href="https://github.com/substack/node-shell-quote">node.js shell-quote</a> for client-side JavaScript</li>' +
    '<li>Using <a href="http://easyrtc.com/">easyRTC</a> for the WebRTC backend</li>' +
    '</ul>'
);

// Main entry point
$(document).ready(function() {
    NavBar.initialize();
    NavBar.attrBtn.onClick(function() {
        Dialog.show({
            title: 'About',
            content: attrDialogTmpl({})
        });
    });
    NavBar.soundBtn.disableButton();

    Clock.initialize();

    svgToInlineSvg(function() {
        NavBar.show();
        Login
            .initialize({
                cameraBtn: NavBar.cameraBtn,
                micBtn: NavBar.micBtn,
                dashBtn: NavBar.dashBtn
            })
            .done(function(params) {
                // This is called if the userName and roomName are valid and we are ready to join
                // the chat. At this point, when call vtcMain()
                vtcMain(params);
            });
    });
});
