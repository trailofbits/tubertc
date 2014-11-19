function appInit() {
    var mainPage = document.getElementById("mainPage");
    var roomField = document.getElementById("roomField");
    var goBtn = document.getElementById("goBtn");

    var DefaultRoomFieldText = "Room Name...";
    var idleRoomFieldStyle = function () {
        roomField.style.fontStyle = "italic";
        roomField.style.color = "#c0c0c0";
        roomField.value = DefaultRoomFieldText;
    };
    var activeRoomFieldStyle = function () {
        roomField.style.fontStyle = "normal";
        roomField.style.color = "#a0a0a0";
        roomField.value = "";
    };
    
    mainPage.open = true;
    idleRoomFieldStyle();

    roomField.addEventListener("focus", function () {
        if (roomField.value == DefaultRoomFieldText) {
            activeRoomFieldStyle();
        }
    });
    roomField.addEventListener("blur", function () {
        if (roomField.value.length == 0) {
            idleRoomFieldStyle();
        }
    });
    
    goBtn.addEventListener("mousedown", function () {
        if (roomField.value != DefaultRoomFieldText) {
            goBtn.style.background = "#33cc33";
            goBtn.style.color = "#336600";
        }
    });
    goBtn.addEventListener("mouseup", function () {
        goBtn.style.background = "#336600";
        goBtn.style.color = "#33cc33";
    });
    goBtn.addEventListener("click", function () {
        if (roomField.value != DefaultRoomFieldText) {
            window.location = "/room/" + roomField.value;
        }
    });
}
