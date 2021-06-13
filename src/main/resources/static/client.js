var conn = new WebSocket('wss://welshimeat.site/socket');

conn.onopen = function() {
    console.log("Connected to the signaling server");
    initialize();
    initAnnyang();
};

conn.onmessage = function(msg) {
    console.log("Got message", msg.data);
    var content = JSON.parse(msg.data);
    var data = content.data;
    switch (content.event) {
        // when somebody wants to call us
        case "offer":
            handleOffer(data);
            break;
        case "answer":
            handleAnswer(data);
            break;
        // when a remote peer sends an ice candidate to us
        case "candidate":
            handleCandidate(data);
            break;
        case "stt":
            handleStt(data);
            break;
        default:
            break;
    }
};

function send(message) {
    conn.send(JSON.stringify(message));
}

var peerConnection;
var dataChannel;

function initialize() {
    var configuration = {
        'iceServers': [
            {
                'urls': 'stun:stun.l.google.com:19302'
            },
            {
                'urls': 'turn:192.158.29.39:3478?transport=udp',
                'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
                'username': '28224511:1379330808'
            },
            {
                'urls': 'turn:192.158.29.39:3478?transport=tcp',
                'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
                'username': '28224511:1379330808'
            }
        ]
    };

    peerConnection = new RTCPeerConnection(configuration);

    // Setup ice handling
    peerConnection.onicecandidate = function(event) {
        if (event.candidate) {
            send({
                event : "candidate",
                data : event.candidate
            });
        }
    };


    peerConnection.onaddstream = function(event) {
        $("#remoteVideo")[0].srcObject = event.stream;
    };

    // creating data channel
    dataChannel = peerConnection.createDataChannel("dataChannel", {
        reliable : true
    });

    dataChannel.onerror = function(error) {
        console.log("Error occured on datachannel:", error);
    };

    // when we receive a message from the other peer, printing it on the console
    dataChannel.onmessage = function(event) {
        addOthersMessage(event.data);
    };

    dataChannel.onclose = function() {
        console.log("data channel is closed");
    };

    peerConnection.ondatachannel = function (event) {
        dataChannel = event.channel;
    };

}

function createOffer() {
    peerConnection.createOffer(function(offer) {
        send({
            event : "offer",
            data : offer
        });
        peerConnection.setLocalDescription(offer);
    }, function(error) {
        alert("Error creating an offer");
    });
}

function handleOffer(offer) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    // create and send an answer to an offer
    peerConnection.createAnswer(function(answer) {
        peerConnection.setLocalDescription(answer);
        send({
            event : "answer",
            data : answer
        });
    }, function(error) {
        alert("Error creating an answer");
    });
}


function handleCandidate(candidate) {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
};

function handleAnswer(answer) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    console.log("connection established successfully!!");
};

function handleStt(stt){
    $('#result')[0].innerHTML = stt;
}

function sendVideo(){
    const constraints = {
        video: true, audio : true
    };
    navigator.mediaDevices.getUserMedia(constraints).
    then(function(stream) {
        $("#localVideo")[0].srcObject = stream;
        peerConnection.addStream(stream);
        console.log("Successfully get local video");
    }).catch(function(err) {
        console.log("Error occured at sending video!" + err)
    });
}

function sendMessage() {
    dataChannel.send($("#messageInput")[0].value);
    addMyMessage($("#messageInput")[0].value);
    $("#messageInput")[0].value = "";
}

function addMyMessage(message){
    let today = new Date();

    let hours = today.getHours();
    let minutes = today.getMinutes();
    $(".messages").append("<div class=\"chat-box darker\">\n" +
        "                <p >" + message + "</p>\n" +
        "                <span class=\"time-left\">" +  numFormat(hours) + ":" + numFormat(minutes) + "</span>\n" +
        "            </div>");
    $(".messages").scrollTop($(".messages")[0].scrollHeight);
}

function addOthersMessage(message){
    let today = new Date();

    let hours = today.getHours();
    let minutes = today.getMinutes();
    $(".messages").append("<div class=\"chat-box\">\n" +
        "                <p align=\"right\">" + message + "</p>\n" +
        "                <span class=\"time-right\">" + numFormat(hours) + ":" + numFormat(minutes) + "</span>\n" +
        "            </div>");
    $(".messages").scrollTop($(".messages")[0].scrollHeight);
}

function numFormat(variable) {
    variable = Number(variable).toString();
    if(Number(variable) < 10 && variable.length == 1)
        variable = "0" + variable;
    return variable;
}

function initAnnyang(){
    annyang.start({ autoRestart: true, continuous: true })
    var recognition = annyang.getSpeechRecognizer();
    var final_transcript = '';
    recognition.interimResults = true;
    recognition.onresult = function(event) {
        final_transcript = '';
        for (var i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                final_transcript += event.results[i][0].transcript;
            }
        }
        console.log("final_transcript="+final_transcript);
        send({
            event : "stt",
            data : final_transcript
        });
    };
}
