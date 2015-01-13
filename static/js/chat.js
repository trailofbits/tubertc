/* Defines the chat panel UI elements.
 */

var resizeChatPanes = function () {
    var historyPaneHeight = $('.sidePanelContent').height() - $('.chatControlPane').height() - 10;
    $('.chatHistoryPane').css('height', historyPaneHeight + 'px');
};

var getRandomColor = function () {
    var h = Math.floor((Math.random() * 360) / 24) * 24;
    return 'hsl(' + h + ', 100%, 25%)';
};

var Chat = function (roomName) {
    // Default color palette for chatTextEntry. 'Idle' means that the text entry element does
    // not contain any text worth saving.
    this.kIdleTextColor = '#c0c0c0';
    this.kActiveTextColor = $('#chatTextEntry').css('color');
    
    // Default time-to-live for notifications (in seconds)
    this.kDefaultNotificationTimeout = 6.5;

    this._appendLine = function (content) {
        $('.chatHistoryPane')
            .append(content)
            .stop(true, false)
            .animate({
                scrollTop : $('.chatHistoryPane').prop('scrollHeight')
            }, 'slow');
    };
    
    this._generateUniqueColor = function (userName) {
        var tries = 5;
        var hsvColor = getRandomColor();
        
        // Generate a random HSV value til an unique one is found or we reached 5 tries
        while (this.colorsUsed.indexOf(hsvColor) > -1 && tries > 0) {
            hsvColor = getRandomColor();
            tries--;
        }
        
        if (tries === 0) {
            ErrorMetric.log('Could not generate random color for user ' + userName);

            // Return black in the case of an error
            return 'hsl(0, 0%, 0%, 1)';
        }
        
        this.userColorMap[userName] = hsvColor;
        this.colorsUsed.push(hsvColor);

        return hsvColor;
    };
    
    this._notify = function (title, msg, ttl) {
        if (this.showNotifications) {
            var notification = new Notification(title, {
                body : msg
            });
            
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
     *   userName : String
     *     The name of the user that entered the chatroom
     */
    this.userEntered = function (userName) {
        var chatObj = this;
        if (this.userName !== null) {
            var hsvColor = this._generateUniqueColor(userName);
            var content = this.userEnteredTmpl({
                color : hsvColor,
                user  : userName,
                room  : chatObj.roomName
            });
            
            // Do not show self events
            if (this.userName !== userName) {
                this._notify('Room Status', userName + ' has entered the room');
            }

            this._appendLine(content);
        } else {
            ErrorMetric.log('Chat.userEntered => userEnter invoked without Chat.userName');
        }
    };
    
    /* Parameters:
     *   userName : String
     *     The name of the user that left the chatroom
     */
    this.userLeft = function (userName) {
        var chatObj = this;
        if (this.userName !== null) {
            var hsvColor = this.userColorMap[userName];
            if (hsvColor !== undefined) {
                var content = this.userLeftTmpl({
                    color : hsvColor,
                    user  : userName,
                    room  : chatObj.roomName     
                });
                
                // Do not show self events
                if (this.userName !== userName) {
                    this._notify('Room Status', userName + ' has left the room');
                }

                this._appendLine(content);

                delete this.userColorMap[userName];

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
    };
    
    /* Parameters:
     *   message : String
     *     The notification message to be added to the Chat interface
     */
    this.addNotification = function (message) {
        var chatObj = this;
        var content = this.notificationTmpl({
            room : chatObj.roomName,
            msg  : message
        });
        this._appendLine(content);
    };

    /* Parameters:
     *   userName : String
     *     The name of the user that sent a message.
     *
     *   message : String
     *     The contents of the message sent by userName.
     */
    this.addMessage = function (userName, message) {
        var chatObj = this;
        if (this.userName !== null) {
            var hsvColor = this.userColorMap[userName];
            if (hsvColor !== undefined) {
                var content = this.messageTmpl({
                    color : hsvColor,
                    user  : userName,
                    msg   : message
                });
                this._appendLine(content);
            } else {
                ErrorMetric.log('Chat.addMessage => "' + userName + '" is not a valid key');
            }
        } else {
            ErrorMetric.log('Chat.addMessage => addMessage invoked without Chat.userName');
        }
    };
    
    /* Parameter:
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
    this.initialize = function (userName, sendMessageFn) {
        var chatObj = this;

        this.userName = userName;
        this.userEntered(userName);
        
        var defaultText = 'Type message here...';
        $('#chatTextEntry')
            .prop('disabled', false)
            .blur(function () {
                var msg = $.trim($('#chatTextEntry').val());
                if (msg.length === 0) {
                    $('#chatTextEntry')
                        .css('font-style', 'italic')
                        .css('color', chatObj.kIdleTextColor)
                        .val(defaultText);
                }
            })
            .focus(function () {
                var msg = $.trim($('#chatTextEntry').val());
                if (msg === defaultText || msg.length === 0) {
                    $('#chatTextEntry')
                        .css('font-style', 'normal')
                        .css('color', chatObj.kActiveTextColor)
                        .val('');
                }
            })
            .keyup(function (e) {
                // Handles the ENTER key so we can send a chat message
                if (e.which === 13) {
                    var msg = $('#chatTextEntry').val();
                    if (sendMessageFn(msg)) {
                        chatObj.addMessage(chatObj.userName, msg);
                    } else {
                        ErrorMetric.log('chatTextEntry.click() => failed to send message');
                        chatObj.addNotification('Failed to send last message');
                    }

                    $('#chatTextEntry')
                        .val('');
                }
            });

        Notification.requestPermission(function (permission) {
            if (permission === 'granted') {
                chatObj.showNotifications = true;
            } else {
                ErrorMetric.log('Chat.initialize -> Notifications are denied');
            }
        });
    };

    // Stores mappings of userName : String -> hsvColor : String pairs
    this.userColorMap = {};

    // Stores a list of hsvColor strings
    this.colorsUsed = [];
    
    this.roomName = roomName;
    this.userName = null;
    
    this.showNotifications = false;

    this.notificationTmpl = Handlebars.compile(
        '<span class="chatNotification">' +
        '<span class="chatRoomName">[{{room}}]</span>: {{msg}}' +
        '</span><br>'
    );

    this.userEnteredTmpl = Handlebars.compile(
        '<span class="chatNotification">' + 
        '<span class="chatUsername" style="color:{{color}}">{{user}}</span> has entered <span class="chatRoomName">{{room}}</span>.' +
        '</span><br>'
    );
    
    this.userLeftTmpl = Handlebars.compile(
        '<span class="chatNotification">' +
        '<span class="chatUsername" style="color:{{color}}">{{user}}</span> has left <span class="chatRoomName">{{room}}</span>.' +
        '</span><br>'
    );
    
    this.messageTmpl = Handlebars.compile(
        '<span class="chatUsername" style="color:{{color}}">{{user}}</span>: ' +
        '<span class="chatMessage">{{msg}}</span><br>'
    );

    return this;
};

// Force a redraw of the control pane
resizeChatPanes();

$(window).resize(function () {
    resizeChatPanes();
});
