/* Defines the main tubertc application logic.
 *
 * Requires:
 *   js/navbar.js
 *   js/login.js
 *   js/dialog.js
 *   js/chat.js
 *   js/viewports.js
 *   Handlebars.js
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

// About dialog template
var attrDialogTmpl = Handlebars.compile(
    // TODO: add some blob of text/image here
    // FIXME: modify attribution information here
    // TODO: check the LICENSE for each of the used frameworks to figure out if there
    //       are any instances of being not compliant
    '<div style="text-align: center">' +
    '  <img style="width: 176px; height: 203px;" src="/images/about_tubertc.svg" alt="[about]">' +
    '</div>' +
    '<ul>' +
    '<li>Icons made by: <a href="http://www.icons8.com" title="Icons8">Icons8</a>, <a href="http://www.icomoon.io" title="Icomoon">Icomoon</a>, <a href="http://www.freepik.com" title="Freepik">Freepik</a>, and <a href="http://yanlu.de" title="Yannick">Yannick</a> from <a href="http://www.flaticon.com" title="Flaticon">www.flaticon.com</a> is licensed under <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0">CC BY 3.0</a></li>' +
    '<li>Using the <a href="http://mincss.com/">Min</a> CSS framework</li>' +
    '<li>Using <a href="http://handlebarsjs.com/">handlebars</a> for templating</li>' +
    '<li>Using <a href="http://chancejs.com/">Chance</a> for generating random room names</li>' +
    '<li>Using <a href="http://easyrtc.com/">easyRTC</a> for the WebRTC backend</li>' +
    '</ul>'
);

// Main entry point
$(document).ready(function () {
    NavBar.initialize();
    NavBar.attrBtn.onClick(function () {
        Dialog.show({
            title   : 'About',
            content : attrDialogTmpl({})
        });
    });

    svgToInlineSvg(function () {
        NavBar.show();
        Login
            .initialize({
                cameraBtn : NavBar.cameraBtn,
                micBtn    : NavBar.micBtn,
                dashBtn   : NavBar.dashBtn
            })
            .done(function (params) {
                // This is called if the userName and roomName are valid and we are ready to join
                // the chat
                
                // TODO: verify that this is a safe operation!
                $('#roomNameField')
                    .text(params.roomName)
                    .fadeIn(function () {
                        // Change the browser's URL bar so that people can use it to give out
                        // links to other future callers
                        history.pushState({}, '', '/?room=' + escape(params.roomName));
                        
                        // Fade in the vtcRoom container used for placing the videos
                        $('.vtcRoom').fadeIn();   
                    });
                
                VTCCore.initialize({
                    cameraIsEnabled : params.cameraIsEnabled,
                    micIsEnabled    : params.micIsEnabled
                });

                // TODO: initialize easyrtc/chat based off of information from params
                //
                //       params = {
                //         userName        : <String>,
                //         roomName        : <String>,
                //         rtcName         : <String>,
                //         cameraIsEnabled : <boolean>,
                //         micIsEnabled    : <boolean>,
                //         dashModeEnabled : <boolean>
                //       }
                //
                // TODO: set handlers for NavBar.*Btn buttons
                // TODO: implement a vtc.js that "wraps" most of easyrtc so in the future,
                //       we can easily re-implement our own WebRTC wrapper

            });
    });
});
