import * as MidiPlayer from "midi-player-js";
import * as scripting from '../scripting';

class MidiState {
    currentFile: File;
    progress: number;
    state: string;
}

export let midi_state: MidiState = {currentFile: null, progress: 0, state: 'stopped'};
export let flow_ctl: boolean = true;

export function setFlowCtl(newVal: boolean) {
    flow_ctl = newVal;
}

export function startCurrentMidiFile() {
    player.play();
    nano_led(simpleIni.nano.play,1);
    nano_led(simpleIni.nano.stop,0);
    midi_state.state = 'playing';
    redrawTop();
}

export function stopMidiFile() {
    nano_led(simpleIni.nano.play,0);
    nano_led(simpleIni.nano.stop,1);
    player.stop();
    midi_state.state = 'stopped';
    redrawTop();
    stopMidiOutput();
    scripting.onMidiStopped();
}

// Initialize player and register event handler
const player = new MidiPlayer.Player(processMidiFromPlayer);


function processMidiFromPlayer(event){
    if(playMidiData(event.bytes_buf)){
        midi_state.progress=player.getSongPercentRemaining();
        redrawTop();
    } else if(!simulated && !connected) {
        player.stop();
        midi_state.state = 'stopped';
        scripting.onMidiStopped();
    }
}

export function stop() {
    player.stop();
}

