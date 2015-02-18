/* Defines the chat panel UI elements.
 *
 * Requires:
 *   Handlebars.js
 *   js/chat-cmds.js
 *   js/sound.js
 *   js/error.js
 */

// jQuery selectors
var _chatTextEntry = $('#chatTextEntry');
var _chatControlPane = $('.chatControlPane');
var _chatHistoryPane = $('.chatHistoryPane');

var resizeChatPanes = function () {
    // outerHeight() includes padding but not margin, margin-top is 2px (see chat.css)
    var chatTextEntryHeight = _chatTextEntry.outerHeight() + 2;
    var chatControlPaneHeight = chatTextEntryHeight;
    _chatControlPane.css('height', chatControlPaneHeight + 'px');

    var historyPaneHeight = $('.sidePanelContent').height() - _chatControlPane.height() - 10;
    _chatHistoryPane.css('height', historyPaneHeight + 'px');
};

var getRandomColor = function () {
    var h = Math.floor((Math.random() * 360) / 24) * 24;
    return 'hsl(' + h + ', 100%, 25%)';
};

// TODO(input): make sure that roomName
var Chat = function (roomName) {
    // An Object storing mappings of peerId : String => userName : String
    var _peerIdMap = {};
    
    var _audio = new SoundClip($('#chatAlertSound')[0]);
    
    // Stores the last peerId to send a message (for Adium-like IM interface)
    var _lastPeerIdMessage = null;

    // Default color palette for chatTextEntry. 'Idle' means that the text entry element does
    // not contain any text worth saving.
    this.kIdleTextColor = '#c0c0c0';
    this.kActiveTextColor = _chatTextEntry.css('color');
    
    // Default time-to-live for notifications (in seconds)
    this.kDefaultNotificationTimeout = 3;
    
    this._appendLine = function (content) {
        _chatHistoryPane
            .append(content)
            .stop(true, false)
            .animate({
                scrollTop : _chatHistoryPane.prop('scrollHeight')
            }, 'slow');
    };

    // Stores mappings of peerId : String -> hsvColor : String pairs
    this.peerColorMap = {};

    // Stores a list of hsvColor strings
    this.colorsUsed = [];
    
    this.roomName = roomName;
    this.peerId = null;
    this.userName = null;
    
    this.showNotifications = false;
    
    this.notificationTmpl = Handlebars.compile(
        '<div class="chatNotification">' +
        '<span class="chatRoomName controlRoomName">[{{room}}]</span>: {{msg}}' +
        '</div>'
    );

    this.userEnteredTmpl = Handlebars.compile(
        '<div class="chatNotification">' + 
        '<span class="chatUsername tooltip" style="color:{{color}}" title="{{id}}">{{user}}</span> has entered <span class="chatRoomName">{{room}}</span>.' +
        '</div>'
    );
    
    this.userLeftTmpl = Handlebars.compile(
        '<div class="chatNotification">' +
        '<span class="chatUsername tooltip" style="color:{{color}}" title="{{id}}">{{user}}</span> has left <span class="chatRoomName">{{room}}</span>.' +
        '</div>'
    );
    
    this.messageTmpl = Handlebars.compile(
        '<div class="chatMessageHeader">' + 
        '<span class="chatUsername tooltip" style="color:{{color}}" title="{{id}}">{{user}}</span>' +
        '<span class="chatTimestamp">{{time}}</span>' + 
        '</div> ' +
        '<div class="chatMessage">{{msg}}</div>'
    );
    
    this.msgContinueTmpl = Handlebars.compile(
        '<div class="chatMessage">{{msg}}</div>'
    );
    
    // Returns a time stamp of the hours, minutes, and seconds
    var getTimeStamp = function () {
        var date = new Date();
        var hours = '' + date.getHours();
        if (hours.length === 1) {
            hours = '0' + hours;
        }
        var min = '' + date.getMinutes();
        if (min.length === 1) {
            min = '0' + min;
        }
        var secs = '' + date.getSeconds();
        if (secs.length === 1) {
            secs = '0' + secs;
        }
        return hours + ':' + min + ':' + secs;
    };

    this._generateUniqueColor = function (peerId) {
        var tries = 5;
        var hsvColor = getRandomColor();
        
        // Generate a random HSV value til an unique one is found or we reached 5 tries
        while (this.colorsUsed.indexOf(hsvColor) > -1 && tries > 0) {
            hsvColor = getRandomColor();
            tries--;
        }
        
        if (tries === 0) {
            ErrorMetric.log('Could not generate random color for user ' + peerId);

            // Return black in the case of an error
            return 'hsl(0, 0%, 0%, 1)';
        }
        
        this.peerColorMap[peerId] = hsvColor;
        this.colorsUsed.push(hsvColor);

        return hsvColor;
    };
    
    this._notify = function (title, msg, ttl) {
        if (this.showNotifications) {
            var notification = new Notification(title, {
                icon : '/images/tubertc_icon.png',
                body : msg
            });
            
            _audio.play();

            // Use default time-to-live if none is provided.
            // (time-to-live is in seconds)
            if (ttl === undefined) {
                ttl = this.kDefaultNotificationTimeout;
            }
        
            setInterval(function () {
                notification.close();
            }, ttl * 1000);
        }
    };

    /* Parameters:
     *   peerId : String
     *     The RTC peer ID of the user that entered the chatroom
     *
     *   userName : String
     *     The name of the user that entered the chatroom
     */
    this.userEntered = function (peerId, userName) {
        var _this = this;

        // TODO: should we give self a special color?
        if (this.peerId !== null) {
            var hsvColor = this._generateUniqueColor(peerId);

            // TODO(input): both userName and roomName come from user-supplied values, are they safe?
            var content = this.userEnteredTmpl({
                color : hsvColor,
                user  : userName,
                id    : peerId,
                room  : _this.roomName
            });
            
            _peerIdMap[peerId] = userName;

            // Do not show self events
            if (this.peerId !== peerId) {
                this._notify('Room Status', userName + ' (' + peerId + ') has entered the room');
            }

            this._appendLine(content);
        } else {
            ErrorMetric.log('Chat.userEntered => userEnter invoked without Chat.userName');
        }

        return this;
    };
    
    /* Parameters:
     *   peerId : String
     *     The peerId of the user that left the chatroom
     *
     * Removes peerId from the chat. We don't use usernames because they can collide. Peer IDs are much
     * more unique and map to user names.
     */
    this.userLeft = function (peerId) {
        var _this = this;
        if (this.peerId !== null) {
            var userName = _peerIdMap[peerId];

            var hsvColor = this.peerColorMap[peerId];
            if (hsvColor !== undefined) {
                // TODO(input): roomName and userName are from tainted user input
                var content = this.userLeftTmpl({
                    color : hsvColor,
                    user  : userName,
                    id    : peerId,
                    room  : _this.roomName     
                });
                
                // Do not show self events
                if (this.peerId !== peerId) {
                    this._notify('Room Status', userName + ' (' + peerId + ') has left the room');
                }

                this._appendLine(content);

                delete this.peerColorMap[peerId];

                var idx = this.colorsUsed.indexOf(hsvColor);
                if (idx > -1) {
                    this.colorsUsed.splice(idx, 1);
                }
            } else {
                ErrorMetric.log('Chat.userLeft => "' + userName + '" is not a valid key'); 
            }
        } else {
            ErrorMetric.log('Chat.userLeft => userLeft invoked without Chat.userName');
        }

        return this;
    };
    
    /* Parameters:
     *   message : String
     *     The notification message to be added to the Chat interface
     */
    this.addNotification = function (message) {
        var _this = this;
        var content = this.notificationTmpl({
            room : _this.roomName,
            msg  : message
        });
        this._appendLine(content);

        return this;
    };
    
    // This is called by the peer message handler in room.js. The content is a raw message Object.
    // Originally, room.js called addMessage but since we are adding new features, this provdies
    // more versatility.
    this.handlePeerMessage = function (peerId, content) {
        if (typeof content.msg === 'string') {
            // New Chat Message message
            //   {
            //     msg : string
            //   }
            this.addMessage(peerId, content.msg);
        // TODO(potato): implement potato message handler here
        } else {
            ErrorMetric.log('Chat.handlePeerMessage => invalid chat peer message from ' + peerId);
        }
    };

    // This function deals with handling chat commands (if valid). If a valid chat command is encountered,
    // this function returns true.
    var _handleChatCommand = function (message) {
        return ChatCommands.handleCommand(message);
    };

    /* Parameters:
     *   peerId : String
     *     The peer ID of the user that sent a message.
     *
     *   message : String
     *     The contents of the message sent by peerId.
     */
    this.addMessage = function (peerId, message) {
        var _this = this;
        if (this.peerId !== null) {
            var userName = _peerIdMap[peerId];
            var hsvColor = this.peerColorMap[peerId];
            if (hsvColor !== undefined && userName !== undefined) {
                var content = null;
                
                if (!_handleChatCommand(message)) {
                    // TODO(input): userName and message come from user input
                    if (_lastPeerIdMessage !== peerId) {
                        content = this.messageTmpl({
                            color : hsvColor,
                            user  : userName,
                            id    : peerId,
                            msg   : message,
                            time  : getTimeStamp()
                        });
                    } else {
                        content = this.msgContinueTmpl({
                            msg : message
                        });
                    }
                    this._appendLine(content);
                    _lastPeerIdMessage = peerId;
                }
            } else {
                ErrorMetric.log('Chat.addMessage => "' + peerId + '" is not a valid key');
            }
        } else {
            ErrorMetric.log('Chat.addMessage => addMessage invoked without Chat.userName');
        }

        return this;
    };
    
    /* Parameter:
     *   peerId : String
     *     The peer ID of the current user.
     *
     *   userName : String
     *     The name of the current user.
     *   
     *   sendMessageFn : function(message) => {true, false}
     *     A callback that gets passed the message from the text entry field. This should tie-in
     *     with a backend that does the busy work of actually sending the message.
     *
     * This function sets up the user controls, binds the user name, and registers a call back
     * for the Chat UI. This connects the components such that messages can get sent out.
     */
    this.initialize = function (peerId, userName, sendMessageFn) {
        var _this = this;
    
        this.peerId = peerId;
        this.userName = userName;

        // FIXME: it would be cool to have some text here...
        this.addNotification('Welcome! Feel free to use this to communicate.');
        this.userEntered(peerId, userName);
        
        // Used for detection of new lines in the chat text entry
        var _lastTextEntryHeight = _chatTextEntry.height();
        
        ChatCommands.initialize(this);

        var defaultText = 'Type message here...';
        _chatTextEntry
            .prop('disabled', false)
            .blur(function () {
                var msg = $.trim(_chatTextEntry.text());
                if (msg.length === 0) {
                    _chatTextEntry
                        .css('font-style', 'italic')
                        .css('color', _this.kIdleTextColor)
                        .text(defaultText);
                }
            })
            .focus(function () {
                var msg = $.trim(_chatTextEntry.text());
                if (msg === defaultText || msg.length === 0) {
                    _chatTextEntry
                        .css('font-style', 'normal')
                        .css('color', _this.kActiveTextColor)
                        .text('');
                }
            })
            .keyup(function (e) {
                var resizePanes = false;

                // Handles the ENTER key so we can send a chat message
                if (e.which === 13) {
                    var msg = _chatTextEntry.text();
                    if (sendMessageFn(msg)) {
                        _this.addMessage(_this.peerId, msg);
                    } else {
                        ErrorMetric.log('chatTextEntry.click() => failed to send message');
                        _this.addNotification('Failed to send last message');
                    }

                    _chatTextEntry
                        .text('');
                    resizePanes = true;   
                } else {
                    // All other keystrokes, we check to see if it causes 
                    if (_lastTextEntryHeight !== _chatTextEntry.height()) {
                        resizePanes = true;
                    }
                }

                if (resizePanes) {
                    _lastTextEntryHeight = _chatTextEntry.height();
                    resizeChatPanes();
                }
            })
            .css('font-style', 'italic')
            .css('color', _this.kIdleTextColor)
            .attr('contenteditable', 'true')
            .text(defaultText);

        Notification.requestPermission(function (permission) {
            if (permission === 'granted') {
                _this.showNotifications = true;
            } else {
                ErrorMetric.log('Chat.initialize -> Notifications are denied');
            }
        });
        
        return this;
    };
    
    // Slides the chat panel down
    this.show = function () {
        $('.chatPanel')
            .stop(false, true)
            .slideDown(function () {
                resizeChatPanes();
            });

        return this;
    };

    return this;
};

// Force a redraw of the control pane
resizeChatPanes();

$(window).resize(function () {
    resizeChatPanes();
});
