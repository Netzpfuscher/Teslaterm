import {transientActive} from "../network/telemetry";
import * as commands from "../network/commands";
import {kill_msg, media_state, midiOut, startCurrentMidiFile, stopMidiFile} from "../midi/midi";
import {terminal} from "../gui/gui";
import {loadSidFile, setSendingSID} from "../sid/sid";
import {redrawMediaInfo} from "../gui/oscilloscope";
import {loadMidiFile} from "../midi/midi_file";
import * as scripting from "../scripting";
import * as fs from "fs";
import * as path from "path";

export const enum MediaFileType {
    none,
    midi,
    sid_dmp,
    sid_emulated
}

export function isSID(type: MediaFileType): boolean {
    return type == MediaFileType.sid_dmp || type == MediaFileType.sid_emulated;
}

export const enum PlayerActivity {
    playing,
    idle
}

export class PlayerState {
    currentFile: string | null;
    type: MediaFileType;
    progress: number;
    state: PlayerActivity;
    title: string | null;
}


let lastTimeoutReset:number = 0;

export function checkTransientDisabled() {
    if (transientActive) {
        const currTime = new Date().getTime();
        if (currTime - lastTimeoutReset > 500) {
            commands.setTransientEnabled(false);
            lastTimeoutReset = currTime;
        }
    }
}

export function startPlaying(): void {
    if (media_state.currentFile == null) {
        terminal.io.println("Please select a media file using drag&drop");
        return;
    }
    if (media_state.state != PlayerActivity.idle) {
        terminal.io.println("A media file is currently playing, stop it before starting it again");
        return;
    }
    if (media_state.type == MediaFileType.midi) {
        startCurrentMidiFile();
    }
    media_state.state = PlayerActivity.playing;
}

export function stopPlaying(): void {
    midiOut.send(kill_msg);
    if (media_state.currentFile == null || media_state.state != PlayerActivity.playing) {
        terminal.io.println("No media file is currently playing");
        return;
    }
    if (isSID(media_state.type)) {
        setSendingSID(true);
        loadSidFile(media_state.currentFile).then(() => {
        });
    } else if (media_state.type == MediaFileType.midi) {
        stopMidiFile();
    }
    media_state.state = PlayerActivity.idle;
    redrawMediaInfo();
    scripting.onMidiStopped();
}

export async function loadMediaFile(file: string): Promise<void> {
    const extension = path.extname(file).substr(1).toLowerCase();
    if (extension === "mid") {
        await loadMidiFile(file);
    } else if (extension == "dmp" || extension == "sid") {
        await loadSidFile(file);
    } else {
        terminal.io.println("Unknown extension: " + extension);
    }
}
