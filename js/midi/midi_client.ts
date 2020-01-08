import {terminal} from "../gui/gui";
import * as midiServer from "./midi_server";
import * as helper from '../helper';
import {midiIn, playMidiData, setMidiInAsNone, setMidiInToSocket} from "./midi";
import {populateMIDISelects} from "./midi_ui";
import * as sliders from '../gui/sliders';

export function onMidiNetworkConnect(status, ip, port, socketId, filter) {
    var error = "Connection to MIDI server at "+ip+":"+port+" failed!";
    if (status>=0) {
        var connectListener = (info)=>{
            if (info.socketId != socketId)
                return;
            // info.data is an arrayBuffer.
            const name = helper.convertArrayBufferToString(info.data);
            chrome.sockets.tcp.onReceive.removeListener(connectListener);
            const data = name+";"+JSON.stringify(filter);
            chrome.sockets.tcp.send(socketId, helper.convertStringToArrayBuffer(data), s=> {
                if (chrome.runtime.lastError) {
                    console.log("Error in midi connect: ", chrome.runtime.lastError.message);
                }
                if (s.resultCode < 0) {
                    terminal.io.println(error);
                    setMidiInAsNone();
                } else {
                    terminal.io.println("Connected to MIDI server \"" + name + "\" at " + ip + ":" + port);
                    setMidiInToSocket(name, socketId, ip, port);
                }
            });
        };
        chrome.sockets.tcp.onReceive.addListener(connectListener);
    } else {
        terminal.io.println(error);
        setMidiInAsNone();
    }
}

export function onMIDIoverIP(info) {
    if (!midiIn.isActive() || info.socketId != midiIn.data)
        return;
    if (chrome.runtime.lastError) {
        console.log("Eror in MIDI over IP: ", chrome.runtime.lastError.message);
        return;
    }
    var data = new Uint8Array(info.data);
    let param = helper.convertArrayBufferToString(info.data).substring(1);
    switch (data[0]) {
        case 'M'.charCodeAt(0):
            playMidiData(data.slice(1, data.length));
            break;
        case 'C'.charCodeAt(0):
            midiIn.cancel(param);
            break;
        case 'L'.charCodeAt(0):
            midiServer.loopTest(param);
            break;
        case 'O'.charCodeAt(0):
            sliders.ontime.setRelativeOntime(data[1]);
            break;
    }
}