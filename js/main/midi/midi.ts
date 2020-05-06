import * as MidiPlayer from "midi-player-js";
import * as helper from "../helper";
import {ScopeIPC} from "../ipc/Scope";
import {Sliders} from "../ipc/sliders";
import {TerminalIPC} from "../ipc/terminal";
import {simulated} from "../main";
import {checkTransientDisabled, media_state} from "../media/media_player";
import {hasUD3Connection, getUD3Connection} from "../connection/connection";
import * as scripting from "../scripting";
import * as midi_ui from "./midi_ui";
import {populateMIDISelects} from "./midi_ui";

export interface IMidiOutput {
    dest: string;

    send(msg: Buffer);
}

export interface IMidiInput {
    cancel: (reason?: any) => void;
    isActive: () => boolean;
    data: any;
    source: string;
}

export const kill_msg = new Buffer([0xB0, 0x77, 0x00]);

export let midiOut: IMidiOutput = {
    dest: "None", send: () => {
        // NOP
    },
};

export const midiNone: IMidiInput = {
    cancel: () => setMidiInAsNone(),
    data: null,
    isActive: () => false,
    source: "",
};

export let midiIn: IMidiInput = midiNone;

export async function startCurrentMidiFile() {
    player.play();
    ScopeIPC.updateMediaInfo();
}

export function stopMidiFile() {
    player.stop();
    ScopeIPC.drawChart();
    stopMidiOutput();
}

export function stopMidiOutput() {
    playMidiData([0xB0, 0x7B, 0x00]);
}

export function setMidiOut(newOut: IMidiOutput) {

    midiOut = newOut;
}

// Initialize player and register event handler
export const player = new MidiPlayer.Player(processMidiFromPlayer);


function processMidiFromPlayer(event: MidiPlayer.Event) {
    if (playMidiEvent(event)) {
        media_state.progress = 100 - player.getSongPercentRemaining();
    } else if (!simulated && !hasUD3Connection()) {
        media_state.stopPlaying();
        scripting.onMidiStopped();
    }
    ScopeIPC.updateMediaInfo();
}

export function stop() {
    player.stop();
}

export function midiMessageReceived(ev) {
    playMidiData(ev.data);
}

const expectedByteCounts = {
    0x80: 3,
    0x90: 3,
    0xA0: 3,
    0xB0: 3,
    0xC0: 2,
    0xD0: 2,
    0xE0: 3,
};

export function playMidiEvent(event: MidiPlayer.Event): boolean {
    const trackObj = player.tracks[event.track - 1];
    // tslint:disable-next-line:no-string-literal
    const track: number[] = trackObj["data"];
    const startIndex = event.byteIndex + trackObj.getDeltaByteCount();
    const data: number[] = [track[startIndex]];
    const len = expectedByteCounts[data[0]];
    if (!len) {
        return true;
    }
    for (let i = 1; i < len; ++i) {
        data.push(track[startIndex + i]);
    }
    return playMidiData(data);
}

export function playMidiData(data: number[] | Uint8Array): boolean {
    if ((simulated || hasUD3Connection()) && data[0] !== 0x00) {
        if (!(data instanceof Uint8Array)) {
            data = new Uint8Array(data);
        }
        const msg = new Buffer(data);
        checkTransientDisabled();
        midiOut.send(msg);
        return true;
    } else {
        return false;
    }
}

export function init() {
    midi_ui.init();
    midi_ui.populateMIDISelects();
    // TODO
    // if (navigator.requestMIDIAccess) {
    //     navigator.requestMIDIAccess().then(midiInit, onMIDISystemError);
    // } else {
    //     alert("No MIDI support in your browser.");
    // }
}

function onMIDISystemError(err) {
    document.getElementById("synthbox").className = "error";
    console.log("MIDI not initialized - error encountered:" + err.code);
}

function midiConnectionStateChange(e) {
    console.log("connection: " + e.port.name + " " + e.port.connection + " " + e.port.state);
    midi_ui.populateMIDISelects();
}

export function midiInit(midi: WebMidi.MIDIAccess) {
    midi.onstatechange = midiConnectionStateChange;
}

export function setMidiInAsNone() {
    if (midiIn.isActive()) {
        midiIn.cancel();
    }
    midiIn = midiNone;
    midi_ui.select(0);
    midi_ui.populateMIDISelects();
}

export function setMidiInToPort(source: WebMidi.MIDIInput) {
    source.onmidimessage = midiMessageReceived;
    let canceled = false;
    midiIn = {
        cancel: () => {
            source.onmidimessage = null;
            canceled = true;
            setMidiInAsNone();
        },
        data: null,
        isActive: () => (!canceled && source.state !== "disconnected"),
        source: source.id,
    };
    midi_ui.populateMIDISelects();
}

export function setMidiInToSocket(name: string, socketId: number, ip: string, port: number) {
    let canceled = false;
    midiIn = {
        cancel: (reason) => {
            canceled = true;
            setMidiInAsNone();
            Sliders.setRelativeAllowed(true);
            if (reason) {
                TerminalIPC.println("Disconnected from MIDI server. Reason: " + reason);
            } else {
                chrome.sockets.tcp.send(socketId, helper.convertStringToArrayBuffer("C"),
                    (s) => {
                        if (chrome.runtime.lastError) {
                            console.log("Disconnect failed: ", chrome.runtime.lastError);
                        }
                        chrome.sockets.tcp.close(socketId);
                    });
                TerminalIPC.println("Disconnected from MIDI server");
            }
        },
        data: {
            id: socketId,
            remote: name + " at " + ip + ":" + port,
        },
        isActive: () => !canceled,
        source: "<Network>",
    };
    populateMIDISelects();
    Sliders.setRelativeAllowed(false);
}
