import * as MidiPlayer from "midi-player-js";
import * as midiServer from './midi_server';
import * as scripting from '../scripting';
import {config, simulated} from '../init';
import * as commands from '../network/commands';
import * as sliders from '../gui/sliders';
import {ontime, setBPS, setBurstOfftime, setBurstOntime} from '../gui/sliders';
import {ConnectionState, transientActive} from "../network/telemetry";
import * as scope from '../gui/oscilloscope';
import * as connection from '../network/connection';
import {connState, socket_midi} from '../network/connection';
import * as nano from '../nano';
import * as midi_ui from "./midi_ui";
import {populateMIDISelects} from "./midi_ui";
import {terminal} from "../gui/gui";
import * as helper from "../helper";
import {onMIDIoverIP} from "./midi_client";
import {sid_file_marked} from "./midi_file";

export interface MidiOutput {
    dest: string;
    send(msg: ArrayBuffer|Uint8Array);
}
export interface MidiInput {
    cancel: Function;
    isActive: Function;
    data: Object;
    source: string;
}

export const enum PlayerState {
    playing,
    idle
}

export const enum MediaFileType {
    none,
    midi,
    sid_dmp
}

class MidiState {
    currentFile: File;
    type: MediaFileType;
    progress: number;
    state: PlayerState;
}

export let media_state: MidiState = {currentFile: null, type:MediaFileType.none, progress: 0, state: PlayerState.idle};

export let sending_sid: boolean = true;
export const kill_msg = new Uint8Array([0xB0,0x77,0x00]);
export const sid_marker = new Uint8Array([0xFF,0xFF,0xFF,0xFF]);
export const byt = 29*2;
export let frame_cnt=byt;
export let frame_cnt_old=0;

let lastTimeoutReset:number = 0;
export let midiOut: MidiOutput = {dest: "None", send: (msg)=>{}};

export const midiNone = {
    isActive: () => false,
    cancel: (arg) => setMidiInAsNone(),
    data: null,
    source: ""
};

export let midiIn: MidiInput = midiNone;
export let midiAccess: WebMidi.MIDIAccess;

export function setFrameCount(newVal: number) {
    frame_cnt_old = frame_cnt;
    frame_cnt = newVal;
}

export function setSendingSID(newVal: boolean) {
    sending_sid = newVal;
}

export function startCurrentMidiFile() {
    player.play();
    nano.setLedState(config.nano.play,1);
    nano.setLedState(config.nano.stop,0);
    scope.redrawMidiInfo();
}

export function stopMidiFile() {
    nano.setLedState(config.nano.play,0);
    nano.setLedState(config.nano.stop,1);
    player.stop();
    scope.drawChart();
    stopMidiOutput();
    scripting.onMidiStopped();
}

export function stopMidiOutput() {
    playMidiData([0xB0,0x7B,0x00]);
}

export function setMidiOut(newOut: MidiOutput) {

    midiOut = newOut;
}

// Initialize player and register event handler
export const player = new MidiPlayer.Player(processMidiFromPlayer);


function processMidiFromPlayer(event: MidiPlayer.Event){
    if(playMidiEvent(event)){
        media_state.progress=100-player.getSongPercentRemaining();
    } else if(!simulated && connState==ConnectionState.UNCONNECTED) {
        player.stop();
        media_state.state = PlayerState.idle;
        scripting.onMidiStopped();
    }
    scope.redrawMidiInfo();
}

export function stop() {
    player.stop();
}

export function midiMessageReceived( ev ) {
    if (!ev.currentTarget.name.includes("nano")) {
        playMidiData(ev.data);
    } else {
        const cmd = ev.data[0] >> 4;
        const channel = ev.data[0] & 0xf;
        const noteNumber = ev.data[1];
        const velocity = ev.data[2];
        if (channel == 9)
            return;

        if (cmd == 8 || ((cmd == 9) && (velocity == 0))) { // with MIDI, note on with velocity zero is the same as note off
            // note off
            //noteOff( noteNumber );

        } else if (cmd == 9) {
            // note on
            //noteOn( noteNumber, velocity/127.0);


            switch (String(noteNumber)) {
                case config.nano.play:
                    nano.setLedState(config.nano.play, 1);
                    nano.setLedState(config.nano.stop, 0);
                    player.play();
                    media_state.state = PlayerState.playing;
                    scope.drawChart();
                    break;
                case config.nano.stop:
                    stopMidiFile();
                    break;
                case config.nano.killset:
                    nano.setCoilHot(false);
                    nano.setLedState(config.nano.killset, 1);
                    nano.setLedState(config.nano.killreset, 0);
                    commands.setKill();
                    break;
                case config.nano.killreset:
                    nano.setCoilHot(true);
                    nano.setLedState(config.nano.killset, 0);
                    nano.setLedState(config.nano.killreset, 1);
                    commands.resetKill();
                    break;
            }
        } else if (cmd == 11) {
            //controller( noteNumber, velocity/127.0);
            switch (String(noteNumber)) {
                case config.nano.slider0:
                    ontime.setAbsoluteOntime(commands.maxOntime * velocity / 127.0);
                    break;
                case config.nano.slider1:
                    setBPS(commands.maxBPS * velocity / 127.0);
                    break;
                case config.nano.slider2:
                    setBurstOntime(commands.maxBurstOntime * velocity / 127.0);
                    break;
                case config.nano.slider3:
                    setBurstOfftime(commands.maxBurstOfftime * velocity / 127.0);
                    break;
            }

        } else if (cmd == 14) {
            // pitch wheel
            //pitchWheel( ((velocity * 128.0 + noteNumber)-8192)/8192.0 );
        } else if (cmd == 10) {  // poly aftertouch
            //polyPressure(noteNumber,velocity/127)
        } else {
            console.log("" + ev.data[0] + " " + ev.data[1] + " " + ev.data[2])
        }
    }
}

const expectedByteCounts = {
    0x80: 3,
    0x90: 3,
    0xA0: 3,
    0xB0: 3,
    0xC0: 2,
    0xD0: 2,
    0xE0: 3
};

export function playMidiEvent(event: MidiPlayer.Event): boolean {
    const trackObj = player.tracks[event.track-1];
    const track: number[] = trackObj['data'];
    const startIndex = event.byteIndex+trackObj.getDeltaByteCount();
    let data: number[] = [track[startIndex]];
    const len = expectedByteCounts[data[0]];
    if (!len) {
        return true;
    }
    for (let i = 1;i<len;++i) {
        data.push(track[startIndex+i]);
    }
    return playMidiData(data);
}

export function playMidiData(data: number[]|Uint8Array): boolean {
    if ((simulated || connState!=ConnectionState.UNCONNECTED) && data[0] != 0x00) {
        const msg=new Uint8Array(data);
        if (!midiServer.sendMidiData(msg)) {
            if (transientActive) {
                const currTime = new Date().getTime();
                if (currTime-lastTimeoutReset>500) {
                    commands.setTransientEnabled(false);
                    lastTimeoutReset = currTime;
                }
            }
            midiOut.send(msg);
        }
        return true;
    } else {
        return false;
    }
}

export function init(){
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess().then(midiInit, onMIDISystemError);
        media_state.progress = 0;
        chrome.sockets.tcp.onReceive.addListener(onMIDIoverIP);
    } else {
        alert("No MIDI support in your browser.");
    }
}

function onMIDISystemError( err ) {
    document.getElementById("synthbox").className = "error";
    console.log( "MIDI not initialized - error encountered:" + err.code );
}

function midiConnectionStateChange( e ) {
    console.log("connection: " + e.port.name + " " + e.port.connection + " " + e.port.state );
    midi_ui.populateMIDISelects();
}

export function midiInit(midi: WebMidi.MIDIAccess) {
    midiAccess = midi;

    //document.getElementById("synthbox").className = "loaded";
    midi_ui.init();
    midi.onstatechange = midiConnectionStateChange;
    midi_ui.populateMIDISelects();
}
export function setMidiInAsNone() {
    if (midiIn.isActive()) {
        midiIn.cancel(null);
    }
    midiIn = midiNone;
    midi_ui.select(0);
    midi_ui.populateMIDISelects();
}

export function setMidiInToPort(source: WebMidi.MIDIInput) {
    source.onmidimessage = midiMessageReceived;
    let canceled = false;
    midiIn = {
        cancel: (arg) => {
            source.onmidimessage = null;
            canceled = true;
            setMidiInAsNone();
        },
        isActive: () => (!canceled && source.state != "disconnected"),
        source: source.id,
        data: null
    };
    midi_ui.populateMIDISelects();
}

export function setMidiInToSocket(name: string, socketId: number, ip: string, port: number) {
    let canceled = false;
    midiIn = {
        cancel: (reason) => {
            canceled = true;
            setMidiInAsNone();
            sliders.ontime.setRelativeAllowed(true);
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
        data: {
            remote: name + " at " + ip + ":" + port,
            id: socketId
        }
    };
    populateMIDISelects();
    sliders.ontime.setRelativeAllowed(false);
}

export function update() {
    if(sid_file_marked && media_state.state==PlayerState.playing && media_state.type==MediaFileType.sid_dmp
        && sending_sid==true){
        if(connection.connState==ConnectionState.CONNECTED_IP){
            if(socket_midi){
                chrome.sockets.tcp.send(socket_midi, sid_file_marked.slice(frame_cnt_old,frame_cnt), ()=>{});
            }
            frame_cnt_old=frame_cnt;
            frame_cnt+=byt;
            media_state.progress = Math.floor(100*(frame_cnt/sid_file_marked.byteLength));
            if(frame_cnt>sid_file_marked.byteLength){
                media_state.state = PlayerState.idle;
                frame_cnt=byt;
                frame_cnt_old=0;
                console.log("finished");
            }
            scope.redrawMidiInfo();
        }
    }
}