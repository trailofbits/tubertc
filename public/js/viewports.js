/**
 * @file Defines the dashboard and viewport UI components.
 */

'use strict';

var PARENT_CONTAINER_ID = 'vtcRoom';
var trtcDash = null;

/**
 * Creates a new Viewport instance.
 *
 * @param {String} peerName - The peer name of the user
 * for which we should create a new viewport.
 * @param {Object} dashboard - A Dashboard instance.
 * @class
 */
var Viewport = function(peerName, dashboard) {
    // This indicates that the viewport is that of itself
    this.isSelf = false;

    // @todo In the future, make use of peerName by utilizing it as a label. However,
    //       being undefined should be a valid state. If undefined do, not add a label.
    this.elem = $('<div></div>', { 'class': 'trtc_viewport' });
    this.view = $('<div></div>', { 'class': 'trtc_view' });

    // By default, mute everything. Unmute only when we are sure it isn't a "self" stream
    this.videoSrc = $('<video></video>', { title: peerName }).prop('muted', true);
    this.userIcon = $('<img src="/images/user.svg">')
                        .attr('alt', peerName)
                        .addClass('trtc_usericon');
    this.muteIcon = $('<img src="/images/muted.svg">')
                        .attr('alt', '[muted]')
                        .addClass('trtc_muted');

    this.nameLabel = null;
    if (peerName !== undefined) {
        this.nameLabel = $('<div></div>', { 'class': 'trtc_label' })
                            .text(peerName);
    }

    this.localMuteIcon = $('<div></div>', { 'class': 'trtc_local_mute' });
    this.isLocallyMuted = false;

    this.audioMeter = $('<div></div>', { 'class': 'trtc_audiometer' });
    this.audioMeterFill = $('<div></div>', { 'class': 'trtc_audiometerfill' });
    this.audioMeter.append(this.audioMeterFill);

    this.view.append(this.videoSrc);
    this.view.append(this.userIcon);
    this.view.append(this.muteIcon);

    if (this.nameLabel !== null) {
        this.view.append(this.nameLabel);
    }

    this.view.append(this.localMuteIcon);
    this.view.append(this.audioMeter);

    this.elem.append(this.view);

    var _this = this;

    /**
     * Binds a click event handler.
     *
     * @returns {undefined} undefined
     * @public
     */
    this.bindClick = function() {
      // @todo FIXME: this sort of feels and looks kludgey, can we fix this?
        var clickHandler = function() {
            if (dashboard.hangoutsMode) {
                var i = dashboard.viewportArray.indexOf(_this);

                // Ignore the first element because that is the main
                // display and it implies we are already the main display.
                if (i > 0) {
                    var item = dashboard.viewportArray.splice(i, 1)[0];
                    dashboard.viewportArray.unshift(item);
                    dashboard.placeViewports();
                }
            }
        };

        // Anything clickable we make clickable for the
        // purpose of switching the main video source.
        // @todo FIXME: there has to be a better mechanism for this?
        this.videoSrc.click(function() {
            clickHandler();
        });

        this.muteIcon.click(function() {
            // @todo FIXME (UI): on double click, this causes a selection event to occur
            clickHandler();
        });

        this.userIcon.click(function() {
            clickHandler();
        });

        this.audioMeter.click(function() {
            clickHandler();
        });

        if (this.nameLabel !== null) {
            this.nameLabel.click(function() {
                clickHandler();
            });
        }
    };

    /**
     * Binds a hover event handler.
     *
     * @returns {undefined} undefined
     * @public
     */
    this.bindHover = function() {
        if (!this.isSelf) {
            this.view.hover(function() {
                _this.localMuteIcon.css({ opacity: 1 });
            }, function() {
                if (!_this.isLocallyMuted) {
                    _this.localMuteIcon.css({ opacity: 0 });
                }
            });
        }
    };

    /**
     * Shows the camera icon.
     *
     * @param {Boolean} state - True if we show
     * the camera, false otherwise.
     * @returns {undefined} undefined
     * @public
     */
    this.showCamera = function(state) {
        if (state) {
            this.userIcon
                .stop(true, false)
                .fadeOut(function() {
                    _this.videoSrc
                        .stop(true, false)
                        .fadeIn();
                });
        } else {
            this.videoSrc
                .stop(true, false)
                .fadeOut(function() {
                    _this.userIcon
                        .stop(true, false)
                        .fadeIn();
                });
        }
    };

    /**
     * Shows the share icon.
     *
     * @param {Boolean} state - True if we show
     * the share, false otherwise.
     * @returns {undefined} undefined
     * @public
     */
    this.showShare = async function(state) {
        if(state) {
            var displayMediaOptions = {
                video: {
                  cursor: "always"
                },
                audio: false
              };
    
            try {
    
                const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
                this.videoSrc[0].srcObject =  stream 
                stream.getVideoTracks()[0].addEventListener('ended', () => {
                    document.getElementById("shareBtn").click();
                });
                return stream;
            } catch(err) {
                console.error("Error: " + err);
                return null;
            }
        } else {
            const tracks = this.videoSrc[0].srcObject.getTracks();
            tracks.forEach(track => track.stop());
            this.videoSrc[0].srcObject = null;
        }
        
    };

    /**
     * Shows the microphone icon.
     *
     * @param {Boolean} state - True if we show
     * the microphone, false otherwise.
     * @returns {undefined} undefined
     * @public
     */
    this.showMic = function(state) {
        if (state) {
            this.muteIcon
                .stop(true, false)
                .fadeOut();
        } else {
            this.muteIcon
                .stop(true, false)
                .fadeIn();
        }
    };

    /**
     * Sets up the viewport icons.
     *
     * @returns {undefined} undefined
     * @public
     */
    this.setupIcons = function() {
        var dimensions = _this.videoDimensions();

        if (dimensions.limitingValue === 'width') {
            var vidHeight = dimensions.dimensions[1];
            var topOffset = (_this.view.height() - vidHeight) / 2;
            if (!this.isSelf) {
                _this.localMuteIcon.css({ 'margin-top': topOffset, 'margin-right': 2 });
            }

            if (_this.nameLabel !== null) {
                _this.nameLabel.css({ top: topOffset, left: 2 });
            }
            _this.audioMeter.css({ bottom: topOffset, left: 0, width: dimensions.dimensions[0] });
        } else {
            var vidWidth = dimensions.dimensions[0];
            var rightOffset = (_this.view.width() - vidWidth) / 2;
            if (!this.isSelf) {
                _this.localMuteIcon.css({ 'margin-right': rightOffset, 'margin-top': 0 });
            }

            if (_this.nameLabel !== null) {
                _this.nameLabel.css({ left: rightOffset, top: 0 });
            }
            _this.audioMeter.css({ left: rightOffset, bottom: 0, width: vidWidth });
        }

        if (!this.isSelf) {
            _this.localMuteIcon.click(function() {
                var video = _this.videoSrc[0];
                if (_this.isLocallyMuted) {
                    video.muted = false;
                    _this.localMuteIcon.removeClass('trtc_local_mute_muted');
                } else {
                    video.muted = true;
                    _this.localMuteIcon.addClass('trtc_local_mute_muted');
                }
                _this.isLocallyMuted = !_this.isLocallyMuted;
            });
        }
    };

    /**
     * Calculates the viewport's video dimensions.
     *
     * @returns {Object} The video dimensions.
     * @public
     */
    this.videoDimensions = function() {
        var contentAspectRatio = 4 / 3;
        var containerAspectRatio = parseInt(_this.view.css('width'), 10) / _this.view.height();
        var limitingValue = 'width';
        var videoDimensions;

        if (containerAspectRatio > contentAspectRatio) {
            limitingValue = 'height';
        }

        if (limitingValue === 'width') {
            videoDimensions = [this.view.width(), this.view.width() / (contentAspectRatio)];
        } else {
            videoDimensions = [contentAspectRatio * this.view.height(), this.view.height()];
        }
        return { dimensions: videoDimensions, limitingValue: limitingValue };
    };

    return this;
};

/**
 * Creates a new Dashboard instance.
 *
 * @class
 */
var Dashboard = function() {
    // @todo For hangoutsMode, make the all non-primary video clickable
    this.container = null;
    this.elem = null;
    this.orientation = 0;
    this.rowArray = [];
    this.viewportArray = [];
    this.hangoutsMode = true;

    /**
     * Initializes the dashboard.
     *
     * @returns {undefined} undefined
     * @public
     */
    this.init = function() {
        this.container = $(document.getElementById(PARENT_CONTAINER_ID));
        this.elem = $('<div></div>', { id: 'trtc_dashboard' });
        this.container.append(this.elem);

        this.viewportArray = [];
        this.elem.empty();

        this.resize();
    };

    /**
     * Resizes the dashboard.
     *
     * @returns {undefined} undefined
     * @public
     */
    this.resize = function() {
        var container = this.container;
        var h = container.height();
        var w = container.width();

        var aspectRatio = w / h;

        if (aspectRatio < 1.0) {
            this.orientation = 'portrait';
        } else {
            this.orientation = 'landscape';
        }

        this.placeViewports();
    };

    /**
     * Places the viewports in the UI.
     *
     * @returns {undefined} undefined
     * @public
     */
    this.placeViewports = function() {
        var layout;

        if (this.hangoutsMode) {
            layout = this.gridForHangoutsMode();
        } else {
            layout = this.gridForViewportNumber(this.viewportArray.length);
        }

        var maxInRow = Math.max.apply(Math, layout.grid);

        this.elem.empty();
        this.rowArray = [];

        var whichGrid = 0;
        var viewport = null;

        for (var i = 0; i < layout.rows; i++) {
            var row;
            var rowOffset = (100 / maxInRow) * (maxInRow - layout.grid[i]) / 2 + '%';

            if (this.orientation === 'landscape') {
                row = $('<div></div>', { 'class': 'trtc_row' });
                row.css({ height: 100 / layout.rows + '%', left: rowOffset });
            } else {
                row = $('<div></div>', { 'class': 'trtc_column' });
                row.css({ width: 100 / layout.rows + '%', top: rowOffset });
            }

            this.rowArray.push(row);
            this.elem.append(row);

            for (var j = 0; j < layout.grid[i]; j++) {
                viewport = this.viewportArray[whichGrid];

                if (this.orientation === 'landscape') {
                    viewport.elem.css({ width: 100 / maxInRow + '%', height: '100%' });
                } else {
                    viewport.elem.css({ width: '100%', height: 100 / maxInRow + '%' });
                }

                row.append(viewport.elem);

                // When the video is removed from being displayed, it needs
                // load() to be called on it before the video continues.
                viewport.videoSrc.get(0).load();

                whichGrid += 1;
            }
        }

        if (this.hangoutsMode && this.viewportArray.length) {
            this.correctLayoutForHangoutsMode(this);
        }

        // Bind events at the end, after any final resizing
        for (i = 0; i < this.viewportArray.length; i++) {
            viewport = this.viewportArray[i];
            viewport.bindClick();
            viewport.bindHover();
            viewport.setupIcons();
        }
    };

    /**
     * Adjusts the layout for hangouts mode.
     *
     * @param {Object} dashboard - Context Dashboard object.
     * @returns {undefined} undefined
     * @public
     */
    this.correctLayoutForHangoutsMode = function(dashboard) {
        var hangoutsViewport = dashboard.viewportArray[0];
        if (dashboard.orientation === 'landscape') {
            hangoutsViewport.elem.css({ width: '100%', 'padding-right': 0 });

            dashboard.rowArray[0].css({
                height: '85%',
                position: 'initial'
            });
            dashboard.rowArray[1].css({
                height: '15%',
                position: 'initial'
            });
        } else {
            hangoutsViewport.elem.css({ height: '100%', 'padding-bottom': 0 });

            dashboard.rowArray[0].css({
                width: '80%',
                position: 'initial'
            });
            dashboard.rowArray[1].css({
                width: '20%',
                position: 'initial'
            });
        }
    };

    /**
     * Given a viewport number, returns the associated grid.
     *
     * @param {Number} viewports - Viewport number.
     * @returns {Object} Layout configuration object.
     * @public
     */
    this.gridForViewportNumber = function(viewports) {
        // @todo Programmatically generate the configuration
        // object rather than rely on a `case` statement.
        var layout = {};

        switch (viewports) {
        case 0:
            layout = { rows: 0, grid: [] };
            break;
        case 1:
            layout = { rows: 1, grid: [1] };
            break;
        case 2:
            layout = { rows: 1, grid: [2] };
            break;
        case 3:
            layout = { rows: 1, grid: [3] };
            break;
        case 4:
            layout = { rows: 2, grid: [2, 2] };
            break;
        case 5:
            layout = { rows: 2, grid: [2, 3] };
            break;
        case 6:
            layout = { rows: 2, grid: [3, 3] };
            break;
        case 7:
            layout = { rows: 2, grid: [3, 4] };
            break;
        case 8:
            layout = { rows: 2, grid: [4, 4] };
            break;
        case 9:
            layout = { rows: 3, grid: [3, 3, 3] };
            break;
        case 10:
            layout = { rows: 3, grid: [3, 4, 3] };
            break;
        case 11:
            layout = { rows: 3, grid: [4, 3, 4] };
            break;
        case 12:
            layout = { rows: 3, grid: [4, 4, 4] };
            break;
        case 13:
            layout = { rows: 3, grid: [4, 5, 4] };
            break;
        case 14:
            layout = { rows: 3, grid: [5, 4, 5] };
            break;
        case 15:
            layout = { rows: 3, grid: [5, 5, 5] };
            break;
        default:
            break;
        }

        return layout;
    };

    /**
     * Returns the grid configuration for hangouts mode.
     *
     * @returns {Object} Grid configuration object.
     * @public
     */
    this.gridForHangoutsMode = function() {
        if (!this.viewportArray.length) {
            return { rows: 2, grid: [0, 0] };
        }

        return { rows: 2, grid: [1, this.viewportArray.length - 1] };
    };

    /**
     * Shows the viewports in dash mode.
     *
     * @returns {undefined} undefined
     * @public
     */
    this.showDashMode = function() {
        this.hangoutsMode = false;
        if (this.viewportArray.length > 1) {
            this.placeViewports();
        }
    };

    /**
     * Shows the viewports in hangout mode.
     *
     * @returns {undefined} undefined
     * @public
     */
    this.showHangoutsMode = function() {
        this.hangoutsMode = true;
        if (this.viewportArray.length > 1) {
            this.placeViewports();
        }
    };

    /**
     * Generates a dashboard grid for a new user.
     *
     * @param {String} peerName - The peer name of the
     * user for which we should create a grid.
     * @returns {Object} A new Viewport object.
     * @public
     */
    this.createGridForNewUser = function(peerName) {
        var newViewport = new Viewport(peerName, this);

        // If peerName is undefined, this means the viewport is for the user themselves.
        if (peerName === undefined) {
            newViewport.isSelf = true;
        }
        this.viewportArray.push(newViewport);
        this.placeViewports();
        return newViewport;
    };

    /**
     * Removes a user with an associated grid.
     *
     * @param {Number} viewport - The viewport to remove.
     * @returns {undefined} undefined
     * @public
     */
    this.removeUserWithGrid = function(viewport) {
        var viewportIndex = this.viewportArray.indexOf(viewport);
        this.viewportArray.splice(viewportIndex, 1);
        this.placeViewports();
    };
};

$(document).ready(function() {
    trtcDash = new Dashboard();
    trtcDash.init();
    $(window).resize(function() {
        trtcDash.resize();
    });
});
