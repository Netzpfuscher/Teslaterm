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

let received_event = false;
export function playMidiEvent(event: MidiPlayer.Event): boolean {
    received_event = true;
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
    if (hasUD3Connection() && data[0] !== 0x00) {
        if (!(data instanceof Uint8Array)) {
            data = new Uint8Array(data);
        }
        const msg = new Buffer(data);
        getUD3Connection().sendMidi(msg);
        checkTransientDisabled();
        return true;
    } else {
        return simulated && data[0] !== 0;
    }
}

export function update(): void {
    // The MIDI player never outputs multiple events at the same time (always at least 5 ms between). This can result
    // in tones that should start at once starting with a noticeable delay if the main loop runs between the 2 events.
    // This loop forces the MIDI player to output all events that should have played before now
    // It is not necessary to reset received_event before the loop since it isn't necessary to run the loop if no events
    // were processed since the last tick
    let i = 0;
    while (received_event && i < 20) {
        ++i;
        received_event = false;
        player.playLoop(false);
    }
}
