/* Defines custom chat commands
 *
 * Requires:
 *   Handlebars.js
 *   js/shell-quote.js
 *   js/navbar.js
 *   js/error.js
 */

var ChatCommands = {
    _cmds : {},

    _chatObject : null,
    
    initialize : function (chatObj) {
        this._chatObject = chatObj;

        // TODO: add new plugins here
        this.registerCommand(new ListUser());
        this.registerCommand(new CameraToggle());
        this.registerCommand(new MicToggle());
        this.registerCommand(new DashboardToggle());
    },

    registerCommand : function (obj) {
        var cmd = obj.command.toLowerCase();
        this._cmds[cmd] = obj;
    },

    // Must return true or false to indicate whether the command was handled or not.
    handleCommand : function (message) {
        if (message.length < 1) {
            ErrorMetric.log('ChatCommands.handleCommand => message too small');
            ErrorMetric.log('                              msg: "' + message + '"');
            return false;
        }

        var argv = ShellQuote.parse(message.substring(1));
        if (argv.length === 0) {
            ErrorMetric.log('ChatCommands.handleCommand => bad message');
            ErrorMetric.log('                              msg: "' + message + '"');
            return false;
        }

        var cmd = argv[0].toLowerCase();
        if (cmd === 'help') {
            var content = '<div class="chatInternal">';
            content += '<h1>Chat Commands</h1>\n<ul>';
            content += '<li><h2><span class="chatIntCmdName">/help</span></h2>' +
                       '<p>Shows this message</p></li>';
            for (var i in this._cmds) {
                content += '<li>' + this._cmds[i].help() + '</li>\n';
            }
            content += '</ul>\n';
            content += '</div>';

            this._chatObject._appendLine(content);
            return true;
        } else {
            var handler = this._cmds[cmd];
            if (handler !== undefined) {
                return handler.execute(this._chatObject, argv.slice(1));
            } else {
                return false;
            }
        }
    },

    // Handles chat command requests (custom defined) from other peers
    handlePeerMessage : function (type, fromPeerId, content) {
        var obj = this._cmds[type];
        if (obj !== undefined && obj.handleMessage !== undefined) {
            // type must be a valid object and also obj.handleMessage must exist
            obj.handleMessage(fromPeerId, content);
        }
    }
};

/* Creating custom chat commands
 *
 *   var ExampleCommand = function () {
 *       this.command = 'example';
 *       
 *       // This prints out the help message.
 *       // This function should return formatted HTML.
 *       this.help = function () { ... }
 *       
 *       // Required function! This takes in one argument:
 *       //   argv : Array(string)                        WARNING: UNSANITIZED USER INPUT
 *       //   chatObj : Chat object
 *       // This must return true if the command was successfully handled
 *       // or false if an error occurred.
 *       //
 *       // BUGGY: You can use chatObj.sendMessage(content) to send peer messages to the room
 *       this.execute = function (chatObj, argv) { ... }
 *
 *       // Handles peer messages from other clients (optional, no handler will be registered if
 *       // this function is omitted)
 *       //   fromPeerId : string
 *       //   content : user defined Javascript object
 *       this.handleMessage = function (fromPeerId, content) { ... }
 *       ...
 *
 *       return this;
 *   };
 */

var ListUser = function () {
    this.command = 'who';

    this.help = function () {
        return '<h2><span class="chatIntCmdName">/' + this.command + '</span></h2>' +
               '<p>Displays a list of the current users with their associated peer IDs</p>';
    };

    this.execute = function (chatObj, argv) {
        var itemTmpl = Handlebars.compile(
            '<li><h2>{{peerId}}</h2><p class="chatIntIndent">({{userName}})</p></li>\n'
        );

        var content = '<div class="chatInternal">';
        content += '<h1>User List</h1>\n';
        content += '<ul>\n';

        // TODO(input): userName is not to be trusted
        var peerMap = chatObj.getPeerIdToUserNameMap();
        for (var peerId in peerMap) {
            content += itemTmpl({
                peerId : peerId,
                userName : peerMap[peerId]
            });
        }

        content += '</ul>\n';
        content += '</div>';
        chatObj._appendLine(content);
        
        return true;
    };

    return this;
};

var _toggleCmdHelp = function (_this, name) {
    return function () {
        return '<h2><span class="chatIntCmdName">/' + _this.command + '</span> ' + 
               '<span class="chatIntCmdArg">newState</span></h2>' +
               '<p>Changes the state of the ' + name + ' to <span class="chatIntCmdArg">newState</span> (boolean value)</p>';
    };
};

var _toggleCmdExecute = function (_this, name, btn) {
    return function (chatObj, argv) {
        var content = '<div class="chatInternal">';

        if (argv.length === 1) {
            var state = argv[0].toLowerCase();
            if (state === 'on') {
                if (!btn.isSelected()) {
                    btn.clickButton();
                }
                content += '<p>' + name + ' is now <b>ON</b></p>';
            } else if (state === 'off') {
                if (btn.isSelected()) {
                    btn.clickButton();
                }
                content += '<p>' + name + ' is now <b>OFF</b></p>';
            } else {
                content += '<p>Invalid argument for <b>/' + _this.command + '</b></p>';
            }
        } else {
            
            content += '<p>' + name + ' is ';
            if (btn.isSelected()) {
                content += '<b>ON</b>';
            } else {
                content += '<b>OFF</b>';
            }

            content += '</p>';
        }
        
        content += '</div>';
        chatObj._appendLine(content);
        return true;
    };
};

var CameraToggle = function () {
    this.command = 'camera';

    this.help = _toggleCmdHelp(this, 'camera');
    this.execute = _toggleCmdExecute(this, 'Camera', NavBar.cameraBtn);

    return this;
};

var MicToggle = function () {
    this.command = 'mic';

    this.help = _toggleCmdHelp(this, 'microphone');
    this.execute = _toggleCmdExecute(this, 'Microphone', NavBar.micBtn);

    return this;
};

var DashboardToggle = function () {
    this.command = 'dash';

    this.help = _toggleCmdHelp(this, 'dashboard');
    this.execute = _toggleCmdExecute(this, 'Dashboard', NavBar.dashBtn);

    return this;
};

