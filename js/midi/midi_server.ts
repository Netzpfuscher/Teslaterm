import 'chrome';
import * as helper from '../helper';
/**
 * Protocol:
 * When connecting, the server sends its name, afterwards the client sends its name.
 * Afterwards the first byte indicates type of message:
 * 'M': MIDI
 * 'C': Close connection
 * 'L': Loop detection
 * 'O': Set relative ontime
 */

let clients = {};
let clientsBySocket = {};
let active = false;

/**
 * Sends `data` to all connected sockets that accept the data.
 */
export function sendToAll(data) {
    if (typeof(data)==="string") {
        data = helper.convertStringToArrayBuffer(data);
    }
    for (let key in this.clients) {
        if (!this.clients.hasOwnProperty(key)) continue;
        this.sendToClient(this.clients[key], data)
    }
}

export function sendMidiData(data) {
    if (!this.active) {
        return false;
    }
    const buf=new ArrayBuffer(1+data.length);
    const bufView=new Uint8Array(buf);
    bufView[0] = "M".charCodeAt(0);
    for (var i=0; i<data.length; i++) {
        bufView[i+1]=data[i];
    }
    let accepted = false;
    for (let key in this.clients) {
        if (!this.clients.hasOwnProperty(key)) continue;
        const client = this.clients[key];
        const result = matchesFilter(data, client.filter);
        if (result!=0) {
            this.sendToClient(client, bufView);
            if (result>0) {
                accepted = true;
            }
        }
    }
    return accepted;
}

export function sendToClient(client, data) {
    chrome.sockets.tcp.send(client.socketId, data, sendInfo => {
        if (sendInfo.resultCode < 0) {
            this.deleteClient(client);
        }
    });
}

export function close() {
    chrome.sockets.tcpServer.disconnect(this.serverSocketId, ()=>this.onClosed());
    var data = helper.convertStringToArrayBuffer("C");
    for (let key in this.clients) {
        if (!this.clients.hasOwnProperty(key)) continue;
        const client = this.clients[key];
        chrome.sockets.tcp.send(client.socketId, data, sendInfo => {
            if (sendInfo.resultCode>=0) {
                chrome.sockets.tcp.close(client.socketId, function (state){});
            }
        });
    }
    this.clients = {};
    this.clientsBySocket = {};
    this.active = false;
}

export function setPort(newPort) {
    var wasActive = this.active;
    if (wasActive) {
        close();
    }
    this.port = newPort;
    if (wasActive) {
        this.start();
    }
}

export function setName(newName) {
    this.ttName = newName;
    this.ttNameAsBuffer = helper.convertStringToArrayBuffer(this.ttName);
    document.title = "Teslaterm: "+name;
}

export function requestName() {
    if (!this.ttName) {
        return term_ui.inputStrings("Please enter a name for this TeslaTerm instance", "Enter name", (name) => {
            if ($.trim(name)=='') {
                return 0;
            }
            for (let i = 0;i<name.length;i++) {
                if (name[i]==';') {
                    return 0;
                }
            }
            return -1;
        }, ["Name"]).then((name)=>{
            this.setName(name);
            return Promise.resolve();
        });
    } else {
        return Promise.resolve();
    }
}

export function start() {
    chrome.sockets.tcpServer.create({}, info=>this.createCallback(info));
}

/**
 * Parameter format:
 * <first instance name>;<second instance name>;...
 * Names are assumed to be unique
 */
export function loopTest(currentLoopString) {
    const previous = currentLoopString.split(';');
    let newLoopString;
    if (currentLoopString) {
        newLoopString = currentLoopString+";"+this.ttName;
    } else {
        newLoopString = this.ttName;
    }
    if (previous.length>0 && previous[0]==this.ttName) {
        let loopingName;
        if (previous.length==1) {// This instance is connected to itself
            loopingName = this.ttName;
        } else {// A "real" loop (non-leaf)
            loopingName = previous[1];
        }
        this.removeClient(loopingName, "The connection formed a loop ("+newLoopString+")");
    } else {
        this.sendToAll("L"+newLoopString);
    }
}

export function removeClient(name, reason) {
    const client = this.clients[name];
    const data = helper.convertStringToArrayBuffer("C"+reason);
    chrome.sockets.tcp.send(client.socketId, data, sendInfo => {
        chrome.sockets.tcp.close(client.socketId, function (state){});
        this.deleteClient(client, reason);
    });
}

export function sendRelativeOntime(percentage, client = undefined) {
    if (!this.active) {
        return;
    }
    let data = new ArrayBuffer(2);
    let dataView = new Uint8Array(data);
    dataView[0] = 'O'.charCodeAt(0);
    dataView[1] = percentage;//Always between 0 and 100
    if (client) {
        this.sendToClient(client, data);
    } else {
        this.sendToAll(data);
    }
}

export function matchesFilter(data, filter): number {
    var channel = undefined;
    var note = undefined;
    switch (data[0] & 0xF0) {
        case 0x80:
        case 0x90:
        case 0xA0:
            channel = data[0] & 0x0F;
            note = data[1] & 0x7F;
            break;
        case 0xB0:
        case 0xC0:
        case 0xD0:
        case 0xE0:
            channel = data[0] & 0x0F;
            break;
        default:
            return -1;
    }
    return matchesFilterExtracted(filter, channel, note);
}

//INTERNAL USE ONLY!
function createCallback(createInfo) {
    var socketId = createInfo.socketId;
    chrome.sockets.tcpServer.listen(socketId,
        "127.0.0.1", this.port, resultCode => this.onListenCallback(socketId, resultCode)
    );
}

function onListenCallback(socketId, resultCode) {
    if (resultCode < 0) {
        this.println("Failed to start MIDI server at " + this.port + ": " + chrome.runtime.lastError.message);
    } else {
        this.onStarted();
        this.active = true;
        this.serverSocketId = socketId;
    }
}

function onAccept(info) {
    if (info.socketId != this.serverSocketId)
        return;

    // A new TCP connection has been established.
    chrome.sockets.tcp.send(info.clientSocketId, this.ttNameAsBuffer, result => this.waitForClientName(result, info));
}

function waitForClientName(resultCode, info) {
    var receiveListener = (recvInfo) => {
        if (recvInfo.socketId != info.clientSocketId)
            return;
        console.log(recvInfo.data);
        var data = helper.convertArrayBufferToString(recvInfo.data);
        const remoteName = data.substring(0, data.indexOf(';'));
        const filterString = data.substring(data.indexOf(';') + 1);
        const filter = JSON.parse(filterString);
        chrome.sockets.tcp.setPaused(info.clientSocketId, true);
        chrome.sockets.tcp.onReceive.removeListener(receiveListener);
        const client = {socketId: info.clientSocketId, name: remoteName, filter: filter};
        this.addClient(client);//Object to make adding filter data later easier
        this.loopTest("");
        this.onConnected(client);
    };
    chrome.sockets.tcp.onReceive.addListener(receiveListener);
    chrome.sockets.tcp.setPaused(info.clientSocketId, false);
}

function onMessage(socketId, data) {
    const client = this.clientsBySocket[socketId];
    if (client) {
        const firstByte = new Uint8Array(data)[0];
        if (firstByte == 'C'.charCodeAt(0)) {
            this.deleteClient(client);
        }
    }
}

function deleteClient(client, reason = null) {
    if (reason) {
        this.println("Removed TCP MIDI client \"" + client.name + "\". Reason: " + reason);
    } else {
        this.println("TCP MIDI client \"" + client.name + "\" disconnected!");
    }
    delete this.clients[client.name];
    delete this.clientsBySocket[client.socketId];
}

function addClient(client) {
    this.clients[client.name] = client;
    this.clientsBySocket[client.socketId] = client;
}

function matchesFilterExtracted(filter, channel, note) {
    let resultChannel;
    if (filter.channel.length == 0 || channel == undefined) {
        resultChannel = true;
    } else {
        resultChannel = helper.matchesFilter(filter.channel, channel);
    }
    let resultNote;
    if (filter.note.length == 0 || note == undefined) {
        resultNote = true;
    } else {
        resultNote = helper.matchesFilter(filter.note, note);
    }
    return resultChannel && resultNote;
}


setPort(5678);
chrome.sockets.tcpServer.onAccept.addListener(info=>this.onAccept(info));
chrome.sockets.tcp.onReceive.addListener(args=>this.onMessage(args.socketId, args.data));