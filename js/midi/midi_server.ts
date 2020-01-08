import * as helper from '../helper';
import {inputStrings} from "../gui/ui_helper";
import {terminal} from "../gui/gui";
import {ontime} from "../gui/sliders";
/**
 * Protocol:
 * When connecting, the server sends its name, afterwards the client sends its name.
 * Afterwards the first byte indicates type of message:
 * 'M': MIDI
 * 'C': Close connection
 * 'L': Loop detection
 * 'O': Set relative ontime
 */

class MidiClient {
    socketId: number;
    name: string;
    filter: {
        channel: number[][];
        note: number[][];
    };
}

let clients: {[s: string]: MidiClient} = {};
let clientsBySocket = {};
let serverSocketId: number;
export let port: number;
let ttNameAsBuffer: ArrayBuffer;
export let ttName: string;
export let active = false;

/**
 * Sends `data` to all connected sockets that accept the data.
 */
export function sendToAll(data) {
    if (typeof(data)==="string") {
        data = helper.convertStringToArrayBuffer(data);
    }
    for (let key in clients) {
        if (!clients.hasOwnProperty(key)) continue;
        sendToClient(clients[key], data)
    }
}

export function sendMidiData(data) {
    if (!active) {
        return false;
    }
    const buf=new ArrayBuffer(1+data.length);
    const bufView=new Uint8Array(buf);
    bufView[0] = "M".charCodeAt(0);
    for (let i=0; i<data.length; i++) {
        bufView[i+1]=data[i];
    }
    let accepted = false;
    for (let key in clients) {
        if (!clients.hasOwnProperty(key)) continue;
        const client = clients[key];
        const result = matchesFilter(data, client.filter);
        if (result!=0) {
            sendToClient(client, bufView);
            if (result>0) {
                accepted = true;
            }
        }
    }
    return accepted;
}

export function sendToClient(client, data: number[]|Uint8Array|ArrayBuffer) {
    chrome.sockets.tcp.send(client.socketId, data, sendInfo => {
        if (sendInfo.resultCode < 0) {
            deleteClient(client);
        }
    });
}

export function close() {
    chrome.sockets.tcpServer.disconnect(serverSocketId, ()=>onClosed());
    const data = helper.convertStringToArrayBuffer("C");
    for (let key in clients) {
        if (!clients.hasOwnProperty(key)) continue;
        const client = clients[key];
        chrome.sockets.tcp.send(client.socketId, data, sendInfo => {
            if (sendInfo.resultCode>=0) {
                chrome.sockets.tcp.close(client.socketId, () => {
                });
            }
        });
    }
    clients = {};
    clientsBySocket = {};
    active = false;
}

export function setPort(newPort) {
    const wasActive = active;
    if (wasActive) {
        close();
    }
    port = newPort;
    if (wasActive) {
        start();
    }
}

export function setName(newName) {
    ttName = newName;
    ttNameAsBuffer = helper.convertStringToArrayBuffer(ttName);
    document.title = "Teslaterm: "+name;
}

export function requestName() {
    if (!ttName) {
        return inputStrings("Please enter a name for this TeslaTerm instance", "Enter name", (name) => {
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
            setName(name);
            return Promise.resolve();
        });
    } else {
        return Promise.resolve();
    }
}

export function start() {
    chrome.sockets.tcpServer.create({}, info=>createCallback(info));
}

/**
 * Parameter format:
 * <first instance name>;<second instance name>;...
 * Names are assumed to be unique
 */
export function loopTest(currentLoopString: string) {
    const previous = currentLoopString.split(';');
    let newLoopString;
    if (currentLoopString) {
        newLoopString = currentLoopString+";"+ttName;
    } else {
        newLoopString = ttName;
    }
    if (previous.length>0 && previous[0]==ttName) {
        let loopingName;
        if (previous.length==1) {// This instance is connected to itself
            loopingName = ttName;
        } else {// A "real" loop (non-leaf)
            loopingName = previous[1];
        }
        removeClient(loopingName, "The connection formed a loop ("+newLoopString+")");
    } else {
        sendToAll("L"+newLoopString);
    }
}

export function removeClient(name, reason) {
    const client = clients[name];
    const data = helper.convertStringToArrayBuffer("C"+reason);
    chrome.sockets.tcp.send(client.socketId, data, sendInfo => {
        chrome.sockets.tcp.close(client.socketId, () => {
        });
        deleteClient(client, reason);
    });
}

export function sendRelativeOntime(percentage, client = undefined) {
    if (!active) {
        return;
    }
    let data = new ArrayBuffer(2);
    let dataView = new Uint8Array(data);
    dataView[0] = 'O'.charCodeAt(0);
    dataView[1] = percentage;//Always between 0 and 100
    if (client) {
        sendToClient(client, data);
    } else {
        sendToAll(data);
    }
}

export function matchesFilter(data, filter): number {
    let channel = undefined;
    let note = undefined;
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

function createCallback(createInfo) {
    const socketId = createInfo.socketId;
    chrome.sockets.tcpServer.listen(socketId,
        "127.0.0.1", port, resultCode => onListenCallback(socketId, resultCode)
    );
}

function onListenCallback(socketId, resultCode) {
    if (resultCode < 0) {
        terminal.io.println("Failed to start MIDI server at " + port + ": " + chrome.runtime.lastError.message);
    } else {
        onStarted();
        active = true;
        serverSocketId = socketId;
    }
}

function onStarted() {
    terminal.io.println("MIDI server at " + port + " started!");
    helper.changeMenuEntry('mnu_command', 'startStopMidi', 'Stop MIDI server');
}

function onClosed() {
    terminal.io.println("MIDI server at " + port + " closed!");
    helper.changeMenuEntry('mnu_command', 'startStopMidi', 'Start MIDI server');
}

function onConnected(client: MidiClient) {
    sendRelativeOntime(ontime.relativeVal, client);
    terminal.io.println("Client instance \"" + client.name + "\" connected");
}

function onAccept(info) {
    if (info.socketId != serverSocketId)
        return;

    // A new TCP connection has been established.
    chrome.sockets.tcp.send(info.clientSocketId, ttNameAsBuffer, result => waitForClientName(result, info));
}

function waitForClientName(resultCode, info) {
    const receiveListener = (recvInfo) => {
        if (recvInfo.socketId != info.clientSocketId)
            return;
        console.log(recvInfo.data);
        const data = helper.convertArrayBufferToString(recvInfo.data);
        const remoteName = data.substring(0, data.indexOf(';'));
        const filterString = data.substring(data.indexOf(';') + 1);
        const filter = JSON.parse(filterString);
        chrome.sockets.tcp.setPaused(info.clientSocketId, true);
        chrome.sockets.tcp.onReceive.removeListener(receiveListener);
        const client = {socketId: info.clientSocketId, name: remoteName, filter: filter};
        addClient(client);//Object to make adding filter data later easier
        loopTest("");
        onConnected(client);
    };
    chrome.sockets.tcp.onReceive.addListener(receiveListener);
    chrome.sockets.tcp.setPaused(info.clientSocketId, false);
}

function onMessage(socketId, data) {
    const client = clientsBySocket[socketId];
    if (client) {
        const firstByte = new Uint8Array(data)[0];
        if (firstByte == 'C'.charCodeAt(0)) {
            deleteClient(client);
        }
    }
}

function deleteClient(client, reason = null) {
    if (reason) {
        terminal.io.println("Removed TCP MIDI client \"" + client.name + "\". Reason: " + reason);
    } else {
        terminal.io.println("TCP MIDI client \"" + client.name + "\" disconnected!");
    }
    delete clients[client.name];
    delete clientsBySocket[client.socketId];
}

function addClient(client) {
    clients[client.name] = client;
    clientsBySocket[client.socketId] = client;
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

export function init() {
    setPort(5678);
    chrome.sockets.tcpServer.onAccept.addListener(info => onAccept(info));
    chrome.sockets.tcp.onReceive.addListener(args => onMessage(args.socketId, args.data));
}