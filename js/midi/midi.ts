import * as MidiPlayer from "midi-player-js";
import * as midiServer from './midi_server';
import * as scripting from '../scripting';
import {config, simulated} from '../init';
import * as commands from '../network/commands';
import {ontime, setBPS, setBurstOfftime, setBurstOntime} from '../gui/sliders';
import {ConnectionState, transientActive} from "../network/telemetry";
import * as scope from '../gui/oscilloscope';
import * as connection from '../network/connection';
import {connState, socket_midi} from '../network/connection';
import 'webmidi';
import * as nano from '../nano';
import * as chrome from '../network/chrome_types';
import * as ui_helper from '../gui/ui_helper';
import * as midi_ui from "./midi_ui";
import MIDIInput = WebMidi.MIDIInput;

//TODO split into smaller parts

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

class MidiState {
    currentFile: File;
    progress: number;
    state: string;
}

export enum SidState {
    state0, state1, state2
}

export let midi_state: MidiState = {currentFile: null, progress: 0, state: 'stopped'};

export let flow_ctl: boolean = true;
export let sid_state: SidState;
export const kill_msg = new Uint8Array([0xB0,0x77,0x00]);
export const sid_marker = new Uint8Array([0xFF,0xFF,0xFF,0xFF]);
export const byt = 29*2;
export let frame_cnt=byt
export let frame_cnt_old=0;

export function setSidState(newState: SidState) {
    sid_state = newState;
}

export function setFrameCount(newVal: number) {
    frame_cnt_old = frame_cnt;
    frame_cnt = newVal;
}

export function setFlowCtl(newVal: boolean) {
    flow_ctl = newVal;
}

export function startCurrentMidiFile() {
    player.play();
    nano.setLedState(config.nano.play,1);
    nano.setLedState(config.nano.stop,0);
    midi_state.state = 'playing';
    scope.drawChart();//TODO is this redrawTop?
}

export function stopMidiFile() {
    nano.setLedState(config.nano.play,0);
    nano.setLedState(config.nano.stop,1);
    player.stop();
    midi_state.state = 'stopped';
    scope.drawChart();
    stopMidiOutput();
    scripting.onMidiStopped();
}

export function stopMidiOutput() {
    playMidiData([0xB0,0x7B,0x00]);
    console.log(midiOut);
}

export function setMidiOut(newOut: MidiOutput) {

    midiOut = newOut;
}

// Initialize player and register event handler
const player = new MidiPlayer.Player(processMidiFromPlayer);


function processMidiFromPlayer(event){
    if(playMidiData(event.bytes_buf)){
        midi_state.progress=player.getSongPercentRemaining();
        scope.drawChart();
    } else if(!simulated && connState==ConnectionState.UNCONNECTED) {
        player.stop();
        midi_state.state = 'stopped';
        scripting.onMidiStopped();
    }
}

export function stop() {
    player.stop();
}

export function midiMessageReceived( ev ) {
    if (!ev.currentTarget.name.includes("nano")) {
        playMidiData(ev.data);
    } else {
        var cmd = ev.data[0] >> 4;
        var channel = ev.data[0] & 0xf;
        var noteNumber = ev.data[1];
        var velocity = ev.data[2];
        //console.log(ev);
        if (channel == 9)
            return

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
                    midi_state.state = 'playing';
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
            console.log(noteNumber);
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

let lastTimeoutReset:number = 0;
export let midiOut: MidiOutput = undefined;

function playMidiData(data) {
    var firstByte = data[0];
    if ((simulated || connState!=ConnectionState.UNCONNECTED) && data[0] != 0x00) {
        var expectedByteCount = expectedByteCounts[firstByte & 0xF0];
        if (expectedByteCount && expectedByteCount<data.length) {
            data = data.slice(0, expectedByteCount)
        }
        var msg=new Uint8Array(data);
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

function midi_start(){
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess().then(midiInit, onMIDISystemError);
    } else {
        alert("No MIDI support in your browser.");
    }
}

function onMIDISystemError( err ) {
    document.getElementById("synthbox").className = "error";
    console.log( "MIDI not initialized - error encountered:" + err.code );
}

export let midiIn: MidiInput;
export let midiAccess: WebMidi.MIDIAccess;

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
    midiIn = {
        isActive: () => false,
        cancel: (arg) => setMidiInAsNone(),
        data: null,
        source: ""
    };
    midi_ui.select(0);
    midi_ui.populateMIDISelects();
}

export function setMidiInToPort(source) {
    source.onmidimessage = midiMessageReceived;
    var canceled = false;
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