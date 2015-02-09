var PARENT_CONTAINER_ID = 'vtcRoom';
var trtc_dash = null;

// TODO: for hangoutsMode, make the all non-primary video clickable
var Dashboard = function(){
    this.container = null;
    this.elem = null;
    this.orientation = 0;
    this.rowArray = [];
    this.viewportArray = [];
    this.hangoutsMode = true;

    this.init = function(){
        this.container = $(document.getElementById(PARENT_CONTAINER_ID));
        this.elem = $('<div></div>', {id:'trtc_dashboard'});
        this.container.append(this.elem);

        this.viewportArray = [];
        this.elem.empty();

        this.resize();
    };

    this.resize = function(){
        var container = this.container,
                w = container.width(),
                h = container.height();

        var aspect_ratio = w/h;

        if (aspect_ratio < 1.0) {
            this.orientation = 'portrait';
        }
        else {
            this.orientation = 'landscape';
        }
        
        this.placeViewports();
    };

    this.placeViewports = function(){
        
        var _this = this;

        var layout;
        if (_this.hangoutsMode) {
            layout = _this.gridForHangoutsMode();
        } 
        else {
            layout = _this.gridForViewportNumber(this.viewportArray.length);
        }
        var maxInRow = max_of_array(layout.grid);
    
        _this.elem.empty();
        _this.rowArray = [];

        var whichGrid = 0;

        for (var i=0; i< layout.rows; i++) {
            var row;
            var rowOffset = (100/maxInRow)*(maxInRow-layout.grid[i])/2+'%';
            
            if (this.orientation === 'landscape') {
                row = $('<div></div>', {class:'trtc_row'});
                row.css({height:100/layout.rows+'%', left:rowOffset});
            }
            else {
                row = $('<div></div>', {class:'trtc_column'});
                row.css({width:100/layout.rows+'%', top:rowOffset});
            }

            _this.rowArray.push(row);
            _this.elem.append(row);

            for (var j=0; j<layout.grid[i]; j++) {
                var viewport = _this.viewportArray[whichGrid];

                if (this.orientation === 'landscape') {
                    viewport.elem.css({width:100/maxInRow+'%', height:'100%'});
                }
                else {
                    viewport.elem.css({width:'100%', height:100/maxInRow+'%'});
                }

                row.append(viewport.elem);

                // When the video is removed from being displayed, it needs load() to be
                // called on it before the video continues.
                viewport.videoSrc.get(0).load();

                whichGrid+=1;
            }
            
        }

        if (_this.hangoutsMode && _this.viewportArray.length > 0) {
            _this.correctLayoutForHangoutsMode(_this);
        }

        //bind events at the end, after any final resizing
        for (i=0; i<_this.viewportArray.length; i++){
            var viewport = _this.viewportArray[i];
            viewport.bindClick();
            viewport.bindHover();
            viewport.setupLocalMuteIcon();
        }
    };

    this.correctLayoutForHangoutsMode = function(_this){
        var hangoutsViewport = _this.viewportArray[0];
        if (_this.orientation === 'landscape') {
            hangoutsViewport.elem.css({width:'100%','padding-right':0});

            _this.rowArray[0].css({
                height:'85%',
                position:'initial'
            });
            _this.rowArray[1].css({
                height:'15%',
                position:'initial'
            });
        }
        else {
            hangoutsViewport.elem.css({height:'100%','padding-bottom':0});

            _this.rowArray[0].css({
                width:'80%',
                position:'initial'
            });
            _this.rowArray[1].css({
                width:'20%',
                position:'initial'
            });
        }
    };

    this.gridForViewportNumber = function(viewports) {
        var layout = {};
        switch (viewports) {
            case 0: {
                layout = {'rows': 0, 'grid': []};
                break;
            }
            case 1: {
                layout = {'rows' : 1, 'grid':[1]};
                break;
            }
            case 2: {
                layout = {'rows' : 1, 'grid':[2]};
                break;
            }
            case 3: {
                layout = {'rows' : 1, 'grid':[3]};
                break;
            }
            case 4: {
                layout = {'rows' : 2, 'grid':[2,2]};
                break;
            }
            case 5: {
                layout = {'rows' : 2, 'grid':[2,3]};
                break;
            }
            case 6: {
                layout = {'rows' : 2, 'grid':[3,3]};
                break;
            }
            case 7: {
                layout = {'rows' : 2, 'grid':[3,4]};
                break;
            }
            case 8: {
                layout = {'rows' : 2, 'grid':[4,4]};
                break;
            }
            case 9: {
                layout = {'rows' : 3, 'grid':[3,3,3]};
                break;
            }
            case 10: {
                layout = {'rows' : 3, 'grid':[3,4,3]};
                break;
            }
            case 11: {
                layout = {'rows' : 3, 'grid':[4,3,4]};
                break;
            }
            case 12: {
                layout = {'rows' : 3, 'grid':[4,4,4]};
                break;
            }
            case 13: {
                layout = {'rows' : 3, 'grid':[4,5,4]};
                break;
            }
            case 14: {
                layout = {'rows' : 3, 'grid':[5,4,5]};
                break;
            }
            case 15: {
                layout = {'rows' : 3, 'grid':[5,5,5]};
                break;
            }

        }

        return layout;
    };

    this.gridForHangoutsMode = function() {
        if (this.viewportArray.length === 0) {
            return {'rows':2, 'grid':[0,0]};
        }
        return {'rows': 2, 'grid': [1, this.viewportArray.length-1]};
    };
    
    this.showDashMode = function () {
        this.hangoutsMode = false;
        if (this.viewportArray.length > 1) {
            this.placeViewports();
        }
    };

    this.showHangoutsMode = function () {
        this.hangoutsMode = true;
        if (this.viewportArray.length > 1) {
            this.placeViewports();
        }
    };
    
    this.createGridForNewUser = function(peerName){
        var newViewport = new Viewport(peerName, this);

        // If peerName is undefined, this means the viewport is for the user themselves.
        if (peerName === undefined) {
            newViewport.isSelf = true;
        }
        this.viewportArray.push(newViewport);
        this.placeViewports();
        return newViewport;
    };

    this.removeUserWithGrid = function(viewport) {

        var viewportIndex = this.viewportArray.indexOf(viewport);
        this.viewportArray.splice(viewportIndex, 1);
        this.placeViewports();
    };

};

var Viewport = function(peerName, dashboard) {
    // This indicates that the viewport is that of itself
    this.isSelf = false;

    // TODO: in the future, make use of peerName by utilizing it as a label. However,
    //       being undefined should be a valid state. If undefined do, not add a label.
    this.elem = $('<div></div>', {class:'trtc_viewport'});
    this.view = $('<div></div>', {class:'trtc_view'});

    // By default, mute everything. Unmute only when we are sure it isn't a "self" stream
    this.videoSrc = $('<video></video>', {title:peerName}).prop('muted', true);
    this.userIcon = $('<img src="/images/user.svg">')
                        .attr('alt', peerName)
                        .addClass('trtc_usericon');
    this.muteIcon = $('<img src="/images/muted.svg">')
                        .attr('alt', '[muted]')
                        .addClass('trtc_muted');
    
    this.localMuteIcon = $('<div></div>', {class:'trtc_local_mute'});
    this.isLocallyMuted = false;

    this.view.append(this.videoSrc);
    this.view.append(this.userIcon);
    this.view.append(this.muteIcon);
    this.view.append(this.localMuteIcon);

    this.elem.append(this.view);

    var _this = this;
    
    // TODO FIXME: this sort of feels and looks kludgey, can we fix this?
    this.bindClick = function () {
        var clickHandler = function () {
            if (dashboard.hangoutsMode) {
                var i = dashboard.viewportArray.indexOf(_this);
                
                // Ignore the first element because that is the main display and it implies we are
                // already the main display.
                if (i > 0) {
                    var item = dashboard.viewportArray.splice(i, 1)[0];
                    dashboard.viewportArray.unshift(item);
                    dashboard.placeViewports();
                }
            }
        };

        this.videoSrc.click(function () {
            clickHandler();
        });

        this.userIcon.click(function () {
            clickHandler();
        });
    };

    this.bindHover = function () {
        if (!this.isSelf) {
            this.view.hover(function(){
                    _this.localMuteIcon.css({opacity:1});
                }, function(){
                    if (!_this.isLocallyMuted){
                        _this.localMuteIcon.css({opacity:0});    
                    }
                }
            );
        }
    };
    
    this.showCamera = function (state) {
        if (state) {
            this.userIcon
                .stop(true, false)
                .fadeOut(function () {
                    _this.videoSrc
                        .stop(true, false)
                        .fadeIn();
                });
        } else {
            this.videoSrc
                .stop(true, false)
                .fadeOut(function () {
                    _this.userIcon
                        .stop(true, false)
                        .fadeIn();
                });
        }
    };

    this.showMic = function (state) {
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

    this.setupLocalMuteIcon = function() {
        if (!this.isSelf) {
            var dimensions = _this.videoDimensions(); 
            
            if (dimensions.limitingValue === 'width'){
                var vidHeight = dimensions.dimensions[1];
                var topOffset = (_this.view.height()-vidHeight)/2;
                _this.localMuteIcon.css({'margin-top':topOffset, 'margin-right':0});    
            }
            else {
                var vidWidth = dimensions.dimensions[0];
                var rightOffset = (_this.view.width()-vidWidth)/2;
                _this.localMuteIcon.css({'margin-right':rightOffset, 'margin-top':0});
            }

            _this.localMuteIcon.click(function(){
                var video = _this.videoSrc[0];
                if (_this.isLocallyMuted) {
                    video.muted = false;
                    _this.localMuteIcon.removeClass('trtc_local_mute_muted');
                }
                else {
                    video.muted = true;
                    _this.localMuteIcon.addClass('trtc_local_mute_muted');
                }
                _this.isLocallyMuted = !_this.isLocallyMuted;
            });
        }
    };

    this.videoDimensions = function() {

        var contentAspectRatio = 4/3;
        var containerAspectRatio = parseInt(_this.view.css('width'))/_this.view.height();

        var videoDimensions;

        var limitingValue = 'width';
        if (containerAspectRatio > contentAspectRatio) {
            limitingValue = 'height';
        }

        if (limitingValue === 'width') {
            videoDimensions = [this.view.width(), this.view.width()/(contentAspectRatio)];
        }
        else {
            videoDimensions = [contentAspectRatio*this.view.height(), this.view.height()];
        }
        return {'dimensions':videoDimensions, 'limitingValue':limitingValue};
    };

    return this;
};

$(document).ready(function(){
    trtc_dash = new Dashboard();
    trtc_dash.init();
    $(window).resize(function(){
        trtc_dash.resize();
    });
});
