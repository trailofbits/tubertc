/* Implements the multiparty video chatroom */
// TODO: document me a bit more

// Icon attribution information
var attributionInfo = '<div>Icons made by <a href="http://www.icons8.com" title="Icons8">Icons8</a>, <a href="http://www.icomoon.io" title="Icomoon">Icomoon</a>, <a href="http://www.freepik.com" title="Freepik">Freepik</a>, and <a href="http://yanlu.de" title="Yannick">Yannick</a> from <a href="http://www.flaticon.com" title="Flaticon">www.flaticon.com</a> is licensed under <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0">CC BY 3.0</a></div>';

// Replace all SVG images in the "dashboard" with inline SVGs (added a callback handler for when the replacements are complete)
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

    // Wait for all the AJAX operations to finish before we call the "finished" callback
    $.when.apply($, deferredObjs).done(function () {
        fn();
    });
};

// Handles the UI aspects of the Room
var Room = {
    // Our aspect ration is 4/3. This may not be always true, especially for mobile devices (such as any Android phone with a current 
    // version of Chrome in portrait mode)
    aspectRatio : 4/3,

    // Stores the peer's peerInfo DIV element so that we can remove and modify it easily
    peers : {},
    
    // These handlers are needed to perform easyrtc (or other RTC backend). The idea for this design is to completely separate the UI
    // and the inner-VTC mechanisms
    muteButtonHandler : null,
    toggleCameraHandler : null,
    switchVideoHandler : null,
    
    // Defines the default state of the camera and microphone
    cameraIsOn : true,
    micIsOn : true,
    chatModeEnabled : false,
    isDashMode : false,

    // Calculates height per a given width for an aspectRatio
    heightFromWidth : function (width) {
        return parseInt((1 / this.aspectRatio) * width);
    },
    
    // Calculates width per a given height for an aspectRatio
    widthFromHeight : function (height) {
        return parseInt(this.aspectRatio * height);
    },
    
    // Entry point
    init : function (userName, displayName, roomName) {
        $('.roomPage').fadeIn();
        
        // Replace all the image SVGs (namely the icon for microphone and camera) with inline SVGs so we can change their color.
        // Only when the operation is complete do we setup the page.
        var roomObj = this;
        svgInject(function () {   
            roomObj.setupPage(displayName);
        });
    },
    
    // Updates the peerInfo windows in peerList to be of a proper size relative to the window size. Currently, this size should
    // fit 12 peerInfo windows horizontally. This is called on every window resize operation.
    //
    // FIXME: what happens if we have more than 11 callers + ourselves in a room?
    updatePeerPanel : function () {
        var width = 0;
        var height = 0;

        if (!this.isDashMode) {
            // Subtract 2 from the calculated width for the 2px margin (see div.peerInfo's CSS margin setting)
            width = parseInt($(window).width() / 12) - 4;
            height = this.heightFromWidth(width);
        } else {
            // Bigger boxes for dash mode
            width = parseInt($(window).width() / 4) - 4;
            height = this.heightFromWidth(width);
        }

        $('.peerVideo').css('width', width + 'px');
        $('.peerVideo').css('height', height + 'px');
    },
    
    // Updates the main video screen to fit the main page content container.
    //
    // FIXME: this does not work well for portrait mode cameras (mobile devices) and also in situations where the browser
    //        window has portrait mode dimensions
    updateMainVideo : function () {
        // Only update the main video dimensions if not in dash mode
        if (!this.isDashMode) {
            var borderPad = $(document).height() - $(window).height();
            var navHeight = $('nav.navbar').height() + borderPad;

            var width = $('#roomPageContainer').width();
            var height = this.heightFromWidth(width) - navHeight;
            
            if (height > $(window).height() - navHeight) {
                height = $(window).height() - navHeight;
                width = this.widthFromHeight(height);
            }
            
            $('#mainStream').css('width', width + 'px');
            $('#mainStream').css('height', height + 'px');
        }
    },
      
    // Initializes the button and svg icon's properties and callback handlers
    // The clickHandler function should return the current status of the button (true -> active, false -> inactive).
    // For buttons with no concept of being active or inactive, the default is inactive. The clickHandler should always
    // return false.
    setupIconButton : function (btnId, iconId, config, clickHandler) {
        $(iconId).css('width', config.size);
        $(iconId).css('height', config.size);
        
        if (config.isActive) {
            $(iconId).css('fill', config.activeColor);
        } else {
            $(iconId).css('fill', config.inactiveColor);
        }

        $(iconId).hover(function () {
            $(iconId).css('opacity', '0.5');
        }, function () {
            $(iconId).css('opacity', '1');
        });

        $(btnId).click(function () {
            if (clickHandler()) {
                $(iconId).css('fill', config.activeColor);
            } else {
                $(iconId).css('fill', config.inactiveColor);
            }
            $(btnId).blur();
        });
    },
    
    // Initializes the main video stream and fades the item into view
    initMainStream : function () {
        var mainStream = $('<video id="mainStream" muted></video>').css('display', 'none');
        $('#roomMainContent').append(mainStream);
        mainStream.fadeIn();
    },

    // Sets up page items such as the microphone/camera disable icon buttons and callback handlers for their click events
    setupPage : function (displayName) {
        var roomObj = this;

        // The camera/microphone icon buttons will be 1.5x the height of the navbar text
        var navBarTextHeight = ($('#roomName').height() * 1.5) + 'px';
        
        // Update the UI to display the room's display name
        $('#roomName').text(displayName);
        
        // Setup main stream
        this.initMainStream();

        this.setupIconButton('#micToggleBtn', '#micIcon', {
            "size":          navBarTextHeight,
            "activeColor":   "#009966",
            "inactiveColor": "#cc0033",
            "isActive":      true
        }, function () {
            return roomObj.onToggleMicrophoneClick();
        });
        this.setupIconButton('#cameraToggleBtn', '#cameraIcon', {
            "size":          navBarTextHeight,
            "activeColor":   "#009966",
            "inactiveColor": "#cc0033",
            "isActive":      true
        }, function () {
            return roomObj.onToggleCameraClick();
        });
        this.setupIconButton('#dashBtn', '#dashIcon', {
            "size":          navBarTextHeight,
            "activeColor":   "#009966",
            "inactiveColor": "#cc0033"
        }, function () {
            return roomObj.onToggleDashButton();
        });
        this.setupIconButton('#chatBtn', '#chatIcon', {
            "size":          navBarTextHeight,
            "activeColor":   "#009966",
            "inactiveColor": "#cc0033"
        }, function () {
            return roomObj.onToggleChatButton();
        });
        this.setupIconButton('#creditsBtn', '#creditsIcon', {
            "size":          navBarTextHeight,
            "inactiveColor": "#ccc"
        }, function () {
            return roomObj.onCreditBtnClick();
        });

        // Install a callback for every window resize event
        $(window).resize(function () {
            roomObj.updatePeerPanel();
            roomObj.updateMainVideo();
        });
    },
    
    // Adds a new peerInfo UI object to the peerList and invokes a caller provided callback (mostly for VTC to switch
    // video sources). We also add the newly created peerInfo DIV into a dictionary (peers) that maps peerIds to peerInfo
    // DIV elements.
    addPeer : function (id, name, fn) {
        var peerVidObj = $('<video class="peerVideo"></video>');
        if (id === 'self') {
            peerVidObj.addClass('easyrtcMirror').attr('muted', true);
        }

        var peerInfo = $('<div class="peerInfo"></div>')
            .append(peerVidObj)
            .append($('<div class="peerName">' + name + '</div>'))
            .css('display', 'none');
        
        // Setup the handler for when the peerInfo DIV element is clicked. This should switch the main video source to 
        // the clicked source.
        var roomObj = this;
        peerInfo.click(function () {
            // Only change the main video stream if not in dash mode
            if (!roomObj.isDashMode) {
                roomObj.setMainPeer(id, roomObj.switchVideoHandler);
            }
        });
        
        fn(peerVidObj);
        
        if (!roomObj.isDashMode) {
            // Only add to the peerList if not in dash mode
            $('#peerList').append(peerInfo);
        } else {
            // XXX TODO: do other stuff in dash mode
            // should add to main window instead
        }

        this.updatePeerPanel();
        
        // Only fadeIn if not in dashMode
        if (!roomObj.isDashMode) {
            peerInfo.fadeIn();
        }

        this.peers[id] = peerInfo;
    },
    
    // Updates the peerName DIV text with the actual user's display name. This is used for scenarios where the video
    // stream "arrives" before the peer message with the name to peerId mapping.
    updatePeerName : function (id, name) {
        if (this.peers[id] !== undefined) {
            this.peers[id].find('.peerName').text(name);
        } else {
            // FIXME: can we do anything else here?
            console.log('Could not update name for invalid peerId (' + id + ')');
        }
    },

    // Removes an existing peerInfo DIV element by the peerId
    removePeer : function (id) {
        if (this.peers[id] !== undefined) {
            var peer = this.peers[id];
            peer.fadeOut();
            delete this.peers[id];
        } else {
            // FIXME: should this case ever exist?
            console.log(id + ' does not exist in Room.peers!');
        }
    },
    
    // Sets the main video stream to the video stream of the specified peerId. The function that does the actual video
    // source switching should be in a callback function.
    setMainPeer : function (id, fn) {
        var mainStream = $('#mainStream').removeClass('easyrtcMirror');
        fn(id, mainStream);
        if (id === 'self') {
            mainStream.addClass('easyrtcMirror');
        }
    },
    
    // Pops up a modal dialog element in the Room main page showing an error message for the user to acknowledge
    showError : function (title, message) {
        var closeBtn = $('<button type="button" class="btn btn-lg btn-primary closeBtn">Close</button>').click(function () {
            $('.dialogBox').fadeOut();
        });
        
        $('#modalDialog').html('<h2>' + title + '</h2><p>' + message + '</p>').append(closeBtn);
        $('.dialogBox').fadeIn();
    },
    
    // Pops up a modal dialog element in the Room main page showing attribution information. This is to credit the creators
    // of the microphone and camera icon.
    showCredits : function () {
        var closeBtn = $('<button type="button" class="btn btn-lg btn-primary closeBtn">Close</button>').click(function () {
            $('.dialogBox').fadeOut();
        });
       
        $('#modalDialog').html($('<h3>Credits</h3>' + attributionInfo)).append(closeBtn);
        $('.dialogBox').fadeIn();
    },
    
    // XXX TODO: do prep for entering dash mode such as removing peerVideo from peerList
    enterDashMode : function () {
        $('#mainStream').fadeOut();
        for (var peerId in this.peers) {
            var peer = this.peers[peerId].fadeOut().remove();
            
            // XXX: add new dash stuff
        }
        $('#mainStream').remove();
        $('#roomPageContainer').css('display', 'none');
    },
    
    // XXX TODO: return to normal mode by adding peerVideo to peerList
    // XXX XXX BUG: if you click fast enough, this peer doesn't fadeIn
    exitDashMode : function () {
        $('#roomPageContainer').css('display', 'block');
        this.initMainStream();

        // FIXME: for now, return to the mode with the user's own videostream
        this.setMainPeer('self', this.switchVideoHandler);
        
        for (var peerId in this.peers) {
            var peer = this.peers[peerId].stop(true, true).fadeOut();
            
            // XXX: remove added dash elms
            
            var videoObj = peer.find('.peerVideo');
            this.switchVideoHandler(peerId, videoObj);
            $('#peerList').append(peer);
            peer.stop(true, true).fadeIn();
        }
    },

    // Is used by the VTC object to set the easyrtc specific code to perform the following actions.
    setSwitchVideoHandler : function (fn) {
        this.switchVideoHandler = fn;
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
        this.muteButtonHandler(this.micIsOn);
        return this.micIsOn;
    },
    
    // Handles when the user clicks the enable/disable camera button.
    onToggleCameraClick : function () {
        this.cameraIsOn = !this.cameraIsOn;
        this.toggleCameraHandler(this.cameraIsOn);
        return this.cameraIsOn;
    },
    
    // Handles when the user clicks the chat button.
    onToggleChatButton : function () {
        this.chatModeEnabled = !this.chatModeEnabled;
        // XXX TODO: actually do stuff
        return this.chatModeEnabled;
    },

    // Handles when the user clicks the dash button.
    onToggleDashButton : function () {
        this.isDashMode = !this.isDashMode;
        if (this.isDashMode) {
            this.enterDashMode();
        } else {
            this.exitDashMode();
        }
        return this.isDashMode;
    },

    // Handle when user clicks the credits button
    onCreditBtnClick : function () {
        this.showCredits();
        return false;
    }
};
