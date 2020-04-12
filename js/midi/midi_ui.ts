import {terminal} from "../gui/constants";
import * as ui_helper from '../gui/ui_helper';
import * as helper from '../helper';
import * as connection from "../connection/connection";
import {
    midiAccess,
    midiIn,
    midiMessageReceived,
    midiOut,
    setMidiInAsNone,
    setMidiInToPort,
    setMidiOut,
    stopMidiOutput,
} from "./midi";
import {onMidiNetworkConnect} from "./midi_client";
import * as midiServer from "./midi_server";

let selectMidiIn: HTMLSelectElement;
let selectMidiOut: HTMLSelectElement;

export function init() {
    selectMidiIn = (document.getElementById("midiIn") as HTMLSelectElement);
    selectMidiIn.onchange = onSelectMidiIn;
    selectMidiOut = (document.getElementById("midiOut") as HTMLSelectElement);
    selectMidiOut.onchange = onSelectMidiOut;
}

export function populateMIDISelects() {
    // clear the MIDI input select
    selectMidiIn.options.length = 0;

    addElementKeepingSelected("None", "", midiIn.source, selectMidiIn);
    let networkText = "Network";
    const networkId = "<Network>";
    if (midiIn.source === networkId) {
        networkText = midiIn.data.remote;
    }
    addElementKeepingSelected(networkText, networkId, midiIn.source, selectMidiIn);
    for (const input of midiAccess.inputs.values()) {
        const str = input.name.toString();
        const preferred = !midiIn.isActive() &&
            ((str.indexOf("Tesla") !== -1) || (str.toLowerCase().indexOf("keyboard") !== -1));
        addElementKeepingSelected(input.name, input.id, midiIn.source, selectMidiIn, preferred);
    }
    onSelectMidiIn();
    selectMidiOut.options.length = 0;
    addElementKeepingSelected("UD3", "<Network>", midiOut.dest, selectMidiOut);
    for (const output of midiAccess.outputs.values()) {
        const str = output.name;
        addElementKeepingSelected(str, output.id, midiOut.dest, selectMidiOut, str.indexOf("UD3") >= 0);
    }
    onSelectMidiOut();
}

function enterFilterForMidi(result) {
    ui_helper.inputStrings("Please enter the filters", "MIDI filters", (channel, note) => {
        const filterChannel = helper.parseFilter(channel);
        if (filterChannel === null) {
            return 0;
        }
        const filterNote = helper.parseFilter(note);
        if (filterNote === null) {
            return 1;
        }
        return -1;
    }, ["Channel", "Note"])
        .then((filter) => setMidiInToNetwork(result.ip, result.port, {channel: filter[0], note: filter[1]}));
}

function setMidiInToNetwork(ip: string, port: number, filter) {
    terminal.io.println("Connecting to MIDI server at " + ip + ":" + port + "...");
    chrome.sockets.tcp.create({}, (createInfo) => {
        if (chrome.runtime.lastError) {
            terminal.io.println("Failed to create MIDI socket: " + chrome.runtime.lastError.message);
        } else {
            chrome.sockets.tcp.connect(createInfo.socketId,
                ip, port, (s) => {
                    if (chrome.runtime.lastError) {
                        terminal.io.println("Failed to connect to network MIDI: " + chrome.runtime.lastError.message);
                    } else {
                        onMidiNetworkConnect(s, ip, port, createInfo.socketId, filter);
                    }
                });
        }
    });
}

function onSelectMidiOut() {
    const selected = selectMidiOut.selectedIndex;
    const id = (selectMidiOut[selected] as HTMLOptionElement).value;
    if (id !== midiOut.dest) {
        stopMidiOutput();
        if (id === "<Network>") {
            setMidiOut({
                dest: id,
                send: (data) => connection.getUD3Connection().sendMedia(data),
            });
        } else if (id) {
            const midiSink = midiAccess.outputs.get(id);
            setMidiOut({
                dest: id,
                send: (data) => midiSink.send(data as number[] | Uint8Array),
            });
        } else {
            setMidiOut({
                dest: id,
                send: () => {
                },
            });
        }
        midiOut.dest = id;
    }
}

export function select(sel: number) {
    selectMidiIn.selectedIndex = sel;
}

function onSelectMidiIn() {
    const selected = selectMidiIn.selectedIndex;
    const id = (selectMidiIn[selected] as HTMLOptionElement).value;
    if (id !== midiIn.source) {
        if (midiIn.isActive()) {
            midiIn.cancel(null);
        }

        selectMidiIn.selectedIndex = selected;
        if (id === "<Network>") {
            midiServer.requestName()
                .then(() => ui_helper.inputIpAndPort("Please enter the remote IP address", "MIDI over IP"))
                .then(enterFilterForMidi)
                .catch((err) => {
                    console.log("Caught something!", err);
                    setMidiInAsNone();
                });
        } else if (id) {
            const midiSource = midiAccess.inputs.get(id);
            setMidiInToPort(midiSource);
        } else {
            setMidiInAsNone();
        }
    }
}

function addElementKeepingSelected(name: string, id: string, oldId: string, selector: HTMLSelectElement, forceSelect: boolean = false) {
    const preferred = forceSelect || id === oldId;
    selector.appendChild(new Option(name, id, preferred, preferred));
}
