import * as path from "path";
import {terminal} from "../gui/constants";
import {redrawMediaInfo} from "../gui/oscilloscope/oscilloscope";
import {kill_msg, midiOut, startCurrentMidiFile, stopMidiFile} from "../midi/midi";
import {loadMidiFile} from "../midi/midi_file";
import * as commands from "../network/commands";
import {transientActive} from "../network/telemetry";
import * as scripting from "../scripting";
import {loadSidFile, setSendingSID} from "../sid/sid";

export const enum MediaFileType {
    none,
    midi,
    sid_dmp,
    sid_emulated,
}

export function isSID(type: MediaFileType): boolean {
    return type === MediaFileType.sid_dmp || type === MediaFileType.sid_emulated;
}

export const enum PlayerActivity {
    playing,
    idle,
}

export class PlayerState {
    // TODO make less struct-like and more class-like
    public currentFile: string | null;
    public type: MediaFileType;
    public progress: number;
    public state: PlayerActivity;
    public title: string | null;
}


export let media_state: PlayerState = {
    currentFile: null,
    progress: 0,
    state: PlayerActivity.idle,
    title: null,
    type: MediaFileType.none,
};

export function setMediaType(type: MediaFileType) {
    media_state.type = type;
    commands.setSynth(type);
}

let lastTimeoutReset: number = 0;

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
    if (media_state.currentFile === null) {
        terminal.io.println("Please select a media file using drag&drop");
        return;
    }
    if (media_state.state !== PlayerActivity.idle) {
        terminal.io.println("A media file is currently playing, stop it before starting it again");
        return;
    }
    if (media_state.type === MediaFileType.midi) {
        startCurrentMidiFile();
    }
    media_state.state = PlayerActivity.playing;
}

export function stopPlaying(): void {
    midiOut.send(kill_msg);
    if (media_state.currentFile === null || media_state.state !== PlayerActivity.playing) {
        terminal.io.println("No media file is currently playing");
        return;
    }
    if (isSID(media_state.type)) {
        setSendingSID(true);
        loadSidFile(media_state.currentFile);
    } else if (media_state.type === MediaFileType.midi) {
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
    } else if (extension === "dmp" || extension === "sid") {
        await loadSidFile(file);
    } else {
        terminal.io.println("Unknown extension: " + extension);
    }
}
