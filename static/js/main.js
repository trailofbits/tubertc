/* Implements the main page */

// Strip out all non-alphanumeric and non-spaces for the display name
var displayName = function (rawName) {
    return rawName.replace(/[^\w\s]/gi, '');
};

// Strip out all non-alphanumeric characters to generate a room name
var rtcRoomName = function (rawName) {
    return rawName.replace(/\W/g, '');
};

// This class represents the first "page" of the application
var Main = {
    init : function (room) {
        var showValidationStatus = function (groupId, inputId) {
            $(groupId).removeClass('has-success');
            $(groupId).removeClass('has-error');

            if ($(inputId).val().length > 0) {
                $(groupId).addClass('has-success');
            } else {
                $(groupId).addClass('has-error');
            }
        };

        // Setup verification notifications for the name and room name textboxes
        $('#inputName').blur(function () {
            showValidationStatus('#nameGroup', '#inputName');
        });
        $('#inputRoom').blur(function () {
            showValidationStatus('#roomGroup', '#inputRoom');
        });
        
        // Main validation function for room name and name
        $('#inputButton').click(function () {
            var rawUserName = $('#inputName').val();
            var rawRoomName = $('#inputRoom').val();
            
            if (rawUserName.length === 0) {
                showValidationStatus('#nameGroup', '#inputName');
                $('#inputName').focus();
                return;
            }

            if (rawRoomName.length === 0) {
                showValidationStatus('#roomGroup', '#inputRoom');
                $('#inputRoom').focus();
                return;
            }

            var userName = displayName(rawUserName);
            var roomName = null;
            var roomDisplayName = null;
            if (room !== null) {
                roomName = room.roomName;
                roomDisplayName = room.displayName;
            } else {
                roomName = rtcRoomName(rawRoomName);
                roomDisplayName = displayName(rawRoomName);
            }
            
            // On validation success, transition to the main application (Room object)
            $('#mainPage').fadeOut(function () {
                // FIXME: for UI purposes, truncate userName to 12 characters
                if (userName.length > 12) {
                    userName = userName.substring(0, 12);
                }
                
                // FIXME: for UI purposes, truncate roomDisplayName to 32 characters
                if (roomDisplayName.length > 32) {
                    roomDisplayName = roomDisplayName.substring(0, 32);
                }

                Room.init(userName, roomDisplayName, roomName);
                VTC.init(userName, roomName, Room);

                // Change the browser's URL bar so that people can use the URL to give out as invite links
                history.pushState({}, '', '/?room=' + escape(roomDisplayName));
            });
        });

        // Populate the room field if a room parameter is parsed from query string
        if (room !== null) {
            $('#inputRoom').val(room.displayName);
            $('#inputRoom').attr('disabled', true);
        }
    }
};

// Parses the query string for the room name (if there is one)
var getRoomInfo = function (query) {
    var queryStart = '?room=';
    if (query.length <= queryStart.length || 
        query.indexOf(queryStart) !== 0) {
        return null;
    }

    var rawRoomName = unescape(query.substring(6));
    return {
        "displayName" : displayName(rawRoomName),
        "roomName"    : rtcRoomName(rawRoomName)
    };
};

// Global entry point
$(window).load(function () {
    var room = getRoomInfo(document.location.search);
    Main.init(room);
});
