/* Implements the multiparty video chatroom */

// replace all SVG images in the "dashboard" with inline SVGs (added a callback handler for when the replacements are complete)
// (see http://stackoverflow.com/questions/11978995/how-to-change-color-of-svg-image-using-css-jquery-svg-image-replacement)
var svgInject = function (fn) {
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
    $.when.apply($, deferredObjs).done(function () {
        fn();
    });
};

var Room = {
    // Our aspect ration is 4/3
    aspectRatio : 4/3,

    // Stores...peers?
    peers : {},
    
    muteButtonHandler : null,
    toggleCameraHandler : null,
    switchMainVideoHandler : null,
    
    cameraIsOn : true,
    micIsOn : true,

    // Calculates height per a given width for an aspectRatio
    heightFromWidth : function (width) {
        return parseInt((1 / this.aspectRatio) * width);
    },
    
    // Calculates width per a given height for an aspectRatio
    widthFromHeight : function (height) {
        return parseInt(this.aspectRatio * height);
    },

    init : function (userName, displayName, roomName) {
        $('.roomPage').fadeIn();
        
        var roomObj = this;
        svgInject(function () {   
            roomObj.setupPage(displayName);
        });
    },
    
    // Updates the peerInfo windows in peerList as according to the window size
    updatePeerPanel : function () {
        // Subtract 2 from the calculated width for the 2px margin (see div.peerInfo's margin)
        var width = parseInt($(window).width() / 12) - 4;
        var height = this.heightFromWidth(width);
        
        $('.peerVideo').css('width', width + 'px');
        $('.peerVideo').css('height', height + 'px');
    },
    
    // Updates the main video screen as according to the window size
    updateMainVideo : function () {
        var width = $('#roomPageContainer').width();
        var height = this.heightFromWidth(width);

        $('#mainStream').css('width', width + 'px');
        $('#mainStream').css('height', height + 'px');
    },
    
    setupPage : function (displayName) {
        var roomObj = this;
        var navBarTextHeight = ($('#roomName').height() * 1.5) + 'px';

        $('#roomName').text(displayName);

        // connect handlers for micToggle button click
        $('#micToggleBtn').click(function () {
            roomObj.onToggleMicrophoneClick();
        });
        $('#micIcon').css('height', navBarTextHeight);
        $('#micIcon').css('width', navBarTextHeight);
        $('#micIcon').css('fill', '#00ff00');

        // connect handlers for cameraToggle button click
        $('#cameraToggleBtn').click(function () {
            roomObj.onToggleCameraClick();
        });
        $('#cameraIcon').css('height', navBarTextHeight);
        $('#cameraIcon').css('width', navBarTextHeight);
        $('#cameraIcon').css('fill', '#00ff00');

        // connect handlers for credit button click
        $('#creditBtn').click(function () {
            roomObj.onCreditBtnClick();
        });

        $(window).resize(function () {
            roomObj.updatePeerPanel();
            roomObj.updateMainVideo();
        });
    },
    
    // Adds a new peer UI object to peerList and invokes a caller-defined callback with the newly created
    // video object
    addPeer : function (id, name, fn) {
        var peerVidObj = $('<video class="peerVideo"></video>');
        if (id === 'self') {
            peerVidObj.addClass('easyrtcMirror');
            peerVidObj.attr('muted', true);
        }

        var peerInfo = $('<div class="peerInfo"></div>');
        peerInfo.append(peerVidObj);
        peerInfo.append($('<div class="peerName">' + name + '</div>'));
        peerInfo.css('display', 'none');
        
        // setup the callback for switching main video sources
        var roomObj = this;
        peerInfo.click(function () {
            roomObj.setMainPeer(id, roomObj.switchMainVideoHandler);
        });

        fn(peerVidObj);
        
        $('#peerList').append(peerInfo);
        this.updatePeerPanel();
        peerInfo.fadeIn();

        this.peers[id] = peerInfo;
    },
    
    // Removes an existing peer UI object by the easyrtcId
    removePeer : function (id) {
        if (this.peers[id] !== undefined) {
            var peer = this.peers[id];
            peer.fadeOut();
            delete this.peers[id];
        } else {
            console.log(id + ' does not exist in Room.peers!');
        }
    },
    
    // Sets the main video output to the select peer video stream
    setMainPeer : function (id, fn) {
        var mainStream = $('#mainStream');
        mainStream.removeClass('easyrtcMirror');
        fn(id, mainStream);
        if (id === 'self') {
            mainStream.addClass('easyrtcMirror');
        }
    },
    
    // Pops up a modal dialog window in the main page showing an error
    showError : function (title, message) {
        var closeBtn = $('<button type="button" class="btn btn-lg btn-primary closeBtn">Close</button>');
        closeBtn.click(function () {
            $('.dialogBox').fadeOut();
        });
        
        $('#modalDialog').html('<h2>' + title + '</h2><p>' + message + '</p>');
        $('#modalDialog').append(closeBtn);
        $('.dialogBox').fadeIn();
    },
    
    // Pops up a modal dialog window showing attribution of SVG icons and stuff
    showCredits : function () {
         var closeBtn = $('<button type="button" class="btn btn-lg btn-primary closeBtn">Close</button>');
        closeBtn.click(function () {
            $('.dialogBox').fadeOut();
        });
       
        $('#modalDialog').html($('<h3>Credits</h3><p>Icons made by Freepik from <a href="http://www.flaticon.com" title="Flaticon">www.flaticon.com</a>         is licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0">CC BY 3.0</a></p>'));
        $('#modalDialog').append(closeBtn);
        $('.dialogBox').fadeIn();
    },

    setSwitchMainVideoHandler : function (fn) {
        this.switchMainVideoHandler = fn;
    },
    
    setMuteButtonHandler : function (fn) {
        this.muteButtonHandler = fn;   
    },

    setToggleCameraHandler : function (fn) {
        this.toggleCameraHandler = fn;
    },
    
    // Handles when the user clicks the mute/unmute button
    onToggleMicrophoneClick : function () {
        this.micIsOn = !this.micIsOn;
        if (this.micIsOn) {
            $('#micIcon').css('fill', '#00ff00');
        } else {
            $('#micIcon').css('fill', '#ff0000');
        }
        this.muteButtonHandler(this.micIsOn);
    },
    
    // Handles when the user clicks the enable/disable camera button
    onToggleCameraClick : function () {
        this.cameraIsOn = !this.cameraIsOn;
        if (this.cameraIsOn) {
            $('#cameraIcon').css('fill', '#00ff00');
        } else {
            $('#cameraIcon').css('fill', '#ff0000');
        }
        this.toggleCameraHandler(this.cameraIsOn);
    },

    // Handle when user clicks the credits button
    onCreditBtnClick : function () {
        this.showCredits();
    }
};
