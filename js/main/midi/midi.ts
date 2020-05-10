import * as MidiPlayer from "midi-player-js";
import {ScopeIPC} from "../ipc/Scope";
import {simulated} from "../init";
import {checkTransientDisabled, media_state} from "../media/media_player";
import {getUD3Connection, hasUD3Connection} from "../connection/connection";
import * as scripting from "../scripting";

export const kill_msg = new Buffer([0xB0, 0x77, 0x00]);

// Initialize player and register event handler
export const player = new MidiPlayer.Player(processMidiFromPlayer);

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
        getUD3Connection().sendMidi(msg);
        checkTransientDisabled();
        return true;
    } else {
        return false;
    }
}
