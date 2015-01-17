var PARENT_CONTAINER_ID = 'vtcRoom';
var trtc_dash = null;

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
  }

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
  }

  this.placeViewports = function(){
    
    var _this = this;

    var layout;
    if (_this.hangoutsMode) {
      layout = _this.gridForHangoutsMode();
    } 
    else {
      layout = _this.gridForViewportNumber(this.viewportArray.length);
    }
    var maxInRow = max_of_array(layout['grid'])
  
    _this.elem.empty();
    _this.rowArray = [];

    var whichGrid = 0;

    for (var i=0; i< layout['rows']; i++) {
      var row;
      var rowOffset = (100/maxInRow)*(maxInRow-layout['grid'][i])/2+'%';
      
      if (this.orientation == 'landscape') {
        row = $('<div></div>', {class:'trtc_row'});
        row.css({height:100/layout['rows']+'%', left:rowOffset});
      }
      else {
        row = $('<div></div>', {class:'trtc_column'});
        row.css({width:100/layout['rows']+'%', top:rowOffset});
      }

      _this.rowArray.push(row);
      _this.elem.append(row);

      for (var j=0; j<layout['grid'][i]; j++) {
        var viewport = _this.viewportArray[whichGrid];

        if (this.orientation == 'landscape') {
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
      var hangoutsViewport = _this.viewportArray[0];
      hangoutsViewport.elem.css({width:'100%'});
      hangoutsViewport.view.css({background:'white'});

      _this.rowArray[0].css({height:'100%', left:0});
      _this.rowArray[1].css({height:'120px', 'bottom':'120px'});
    }
  }

  this.gridForViewportNumber = function(viewports) {
    var layout = {};
    switch (viewports) {
      case 0: {
        layout = {'rows': 0, 'grid': []}
        break;
      };
      case 1: {
        layout = {'rows' : 1, 'grid':[1]}
        break;
      };
      case 2: {
        layout = {'rows' : 1, 'grid':[2]}
        break;
      };
      case 3: {
        layout = {'rows' : 1, 'grid':[3]}
        break;
      };
      case 4: {
        layout = {'rows' : 2, 'grid':[2,2]}
        break;
      };
      case 5: {
        layout = {'rows' : 2, 'grid':[2,3]}
        break;
      };
      case 6: {
        layout = {'rows' : 2, 'grid':[3,3]}
        break;
      };
      case 7: {
        layout = {'rows' : 2, 'grid':[3,4]}
        break;
      };
      case 8: {
        layout = {'rows' : 2, 'grid':[4,4]}
        break;
      };
      case 9: {
        layout = {'rows' : 3, 'grid':[3,3,3]}
        break;
      };
      case 10: {
        layout = {'rows' : 3, 'grid':[3,4,3]}
        break;
      };
      case 11: {
        layout = {'rows' : 3, 'grid':[4,3,4]}
        break;
      };
      case 12: {
        layout = {'rows' : 3, 'grid':[4,4,4]}
        break;
      };
      case 13: {
        layout = {'rows' : 3, 'grid':[4,5,4]}
        break;
      };
      case 14: {
        layout = {'rows' : 3, 'grid':[5,4,5]}
        break;
      };
      case 15: {
        layout = {'rows' : 3, 'grid':[5,5,5]}
        break;
      };

    }

    return layout;
  }

  this.gridForHangoutsMode = function() {
    if (this.viewportArray.length == 0) {
      return {'rows':2, 'grid':[0,0]}
    }
    return {'rows': 2, 'grid': [1, this.viewportArray.length-1]}
  }
  
  this.showDashMode = function () {
    this.hangoutsMode = false;
    if (this.viewportArray.length > 1) {
      this.placeViewports();
    }
  },

  this.showHangoutsMode = function () {
    this.hangoutsMode = true;
    if (this.viewportArray.length > 1) {
      this.placeViewports();
    }
  },
  
  // TODO: add peerName as a argument to this function
  this.createGridForNewUser = function(){

    var newViewport = new Viewport();
    this.viewportArray.push(newViewport);
    this.placeViewports();
    return newViewport;
  }

  this.removeUserWithGrid = function(viewport) {

    var viewportIndex = this.viewportArray.indexOf(viewport);
    this.viewportArray.splice(viewportIndex, 1);
    this.placeViewports();
  }

}

// TODO: add labels for each viewport (make constructor take peerName
var Viewport = function(){
  this.elem = $('<div></div>', {class:'trtc_viewport'});
  this.view = $('<div></div>', {class:'trtc_view'});

  // By default, mute everything. Unmute only when we are sure it isn't a "self" stream
  this.videoSrc = $('<video></video>').prop('muted', true);
  
  this.view.append(this.videoSrc);
  this.elem.append(this.view);

  return this;
}

$(document).ready(function(){
  trtc_dash = new Dashboard();
  trtc_dash.init();
  $(window).resize(function(){
    trtc_dash.resize();
  });
});
