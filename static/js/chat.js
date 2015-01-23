/* Defines the chat panel UI elements.
 *
 * Requires:
 *   Handlebars.js
 *   js/sound.js
 *   js/error.js
 */

// jQuery selectors
var _chatTextEntry = $('#chatTextEntry');
var _chatHistoryPane = $('.chatHistoryPane');

var resizeChatPanes = function () {
    var historyPaneHeight = $('.sidePanelContent').height() - $('.chatControlPane').height() - 10;
    _chatHistoryPane.css('height', historyPaneHeight + 'px');
};

var getRandomColor = function () {
    var h = Math.floor((Math.random() * 360) / 24) * 24;
    return 'hsl(' + h + ', 100%, 25%)';
};

var Chat = function (roomName) {
    // An Object storing mappings of peerId : String => userName : String
    var _peerIdMap = {};
    
    var _audio = new SoundClip($('#chatAlertSound')[0]);

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
        '<span class="chatNotification">' +
        '<span class="chatRoomName controlRoomName">[{{room}}]</span>: {{msg}}' +
        '</span><br>'
    );

    this.userEnteredTmpl = Handlebars.compile(
        '<span class="chatNotification">' + 
        '<span class="chatUsername tooltip" style="color:{{color}}" title="{{id}}">{{user}}</span> has entered <span class="chatRoomName">{{room}}</span>.' +
        '</span><br>'
    );
    
    this.userLeftTmpl = Handlebars.compile(
        '<span class="chatNotification">' +
        '<span class="chatUsername tooltip" style="color:{{color}}" title="{{id}}">{{user}}</span> has left <span class="chatRoomName">{{room}}</span>.' +
        '</span><br>'
    );
    
    this.messageTmpl = Handlebars.compile(
        '<span class="chatUsername tooltip" style="color:{{color}}" title="{{id}}">{{user}}</span>: ' +
        '<span class="chatMessage">{{msg}}</span><br>'
    );

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
                var content = this.messageTmpl({
                    color : hsvColor,
                    user  : userName,
                    id    : peerId,
                    msg   : message
                });
                this._appendLine(content);
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

        var defaultText = 'Type message here...';
        _chatTextEntry
            .prop('disabled', false)
            .blur(function () {
                var msg = $.trim(_chatTextEntry.val());
                if (msg.length === 0) {
                    _chatTextEntry
                        .css('font-style', 'italic')
                        .css('color', _this.kIdleTextColor)
                        .val(defaultText);
                }
            })
            .focus(function () {
                var msg = $.trim(_chatTextEntry.val());
                if (msg === defaultText || msg.length === 0) {
                    _chatTextEntry
                        .css('font-style', 'normal')
                        .css('color', _this.kActiveTextColor)
                        .val('');
                }
            })
            .keyup(function (e) {
                // Handles the ENTER key so we can send a chat message
                if (e.which === 13) {
                    var msg = _chatTextEntry.val();
                    if (sendMessageFn(msg)) {
                        _this.addMessage(_this.peerId, msg);
                    } else {
                        ErrorMetric.log('chatTextEntry.click() => failed to send message');
                        _this.addNotification('Failed to send last message');
                    }

                    _chatTextEntry
                        .val('');
                }
            })
            .css('font-style', 'italic')
            .css('color', _this.kIdleTextColor)
            .val(defaultText);

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
