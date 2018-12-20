import {terminal} from "../gui/gui";
import * as midiServer from "./midi_server";
import * as ui_helper from "../gui/ui_helper";
import {midiIn, populateMIDISelects} from "./midi";

export function onMidiNetworkConnect(status, ip, port, socketId, filter) {
    var error = "Connection to MIDI server at "+ip+":"+port+" failed!";
    if (status>=0) {
        var connectListener = (info)=>{
            if (info.socketId != socketId)
                return;
            // info.data is an arrayBuffer.
            var name = helper.convertArrayBufferToString(info.data);
            chrome.sockets.tcp.onReceive.removeListener(connectListener);
            const data = name+";"+JSON.stringify(filter);
            chrome.sockets.tcp.send(socketId, helper.convertStringToArrayBuffer(data), s=>{
                if (s<0) {
                    terminal.io.println(error);
                    setMidiInAsNone();
                } else {
                    terminal.io.println("Connected to MIDI server \""+name+"\" at "+ip+":"+port);
                    var canceled = false;
                    midiIn = {
                        cancel: (reason) => {
                            canceled = true;
                            setMidiInAsNone();
                            ontimeUI.setRelativeAllowed(true);
                            if (reason) {
                                terminal.io.println("Disconnected from MIDI server. Reason: " + reason);
                            } else {
                                chrome.sockets.tcp.send(socketId, helper.convertStringToArrayBuffer("C"),
                                    s=>chrome.sockets.tcp.close(socketId));
                                terminal.io.println("Disconnected from MIDI server");
                            }
                        },
                        isActive: () => !canceled,
                        source: "<Network>",
                        remote: name + " at " + ip + ":" + port,
                        data: socketId
                    };
                    populateMIDISelects();
                    ontimeUI.setRelativeAllowed(false);
                }
            });
        };
        chrome.sockets.tcp.onReceive.addListener(connectListener);
    } else {
        terminal.io.println(error);
        setMidiInAsNone();
    }
}

function onMIDIoverIP(info) {
    if (!midiIn.isActive() || info.socketId != midiIn.data)
        return;
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
            setRelativeOntime(data[1]);
            break;
    }
}