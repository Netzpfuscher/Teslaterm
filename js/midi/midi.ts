import * as MidiPlayer from "midi-player-js";
import * as $ from "jquery";

export let flow_ctl: boolean = true;

export function setFlowCtl(newVal: boolean) {
    flow_ctl = newVal;
}

export function populateMIDISelects() {

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

