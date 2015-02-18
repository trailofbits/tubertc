/* Defines custom chat commands
 *
 * Requires:
 *   Handlebars.js
 *   js/shell-quote.js
 *   js/error.js
 */

var ChatCommands = {
    _cmds : {},
    
    _chatObject : null,
    
    initialize : function (chatObj) {
        this._chatObject = chatObj;
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
            // TODO(ui) FIXME: make the text look more inline with our chatroom!
            var content = '<strong>Valid Chat Commands</strong>';
            content += '<ul>';
            for (var i in this._cmds) {
                content += '<li>' + this._cmds[i].help(true) + '</li>';
            }
            content += '</ul>';

            this._chatObject._appendLine(content);
            return true;
        } else {
            var handler = this._cmds[cmd];
            if (handler !== undefined) {
                return handler.execute(this._chatObject, argv.slice(1));
            } else {
                ErrorMetric.log('ChatCommands.handleCommand => unknown command "' + cmd + '"');
                return false;
            }
        }
    }
};

/* Creating custom chat commands
 *
 *   var ExampleCommand = function () {
 *       this.command = 'example';
 *       
 *       // This prints out the help message.
 *       //   isSummary : boolean
 *       //     Indicates whether the help message should be long or brief
 *       // This function should return formatted HTML.
 *       this.help = function (isSummary) { ... }
 *       
 *       // Required function! This takes in one argument:
 *       //   argv : Array(string)
 *       //   chatObj : Chat object
 *       // This must return true if the command was successfully handled
 *       // or false if an error occurred.
 *       this.execute = function (chatObj, argv) { ... }
 *
 *       ...
 *
 *       return this;
 *   };
 */
var Potato = function () {
    this.command = 'potato';

    this.help = function (isSummary) {
        // TODO: implement me
        if (isSummary) {
            return '<b>' + this.command + '</b> <i>peerId</i> - Sends a potato to the specified <i>peerId</i>';
        } else {
            return '';
        }
    };

    this.execute = function (chatObj, argv) {
        // TODO: implement me
        console.log('Hi');
        return true;
    };

    return this;
};
ChatCommands.registerCommand(new Potato());
