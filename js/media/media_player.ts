import * as path from "path";
import {terminal} from "../gui/constants";
import {redrawMediaInfo} from "../gui/oscilloscope/oscilloscope";
import {kill_msg, midiOut} from "../midi/midi";
import {loadMidiFile} from "../midi/midi_file";
import * as commands from "../network/commands";
import {transientActive} from "../network/telemetry";
import * as scripting from "../scripting";
import {loadSidFile} from "../sid/sid";

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
    public get currentFile(): string | undefined {
        return this.currentFileInt;
    }

    public get type(): MediaFileType {
        return this.typeInt;
    }

    public get state(): PlayerActivity {
        return this.stateInt;
    }

    public get title(): string {
        return this.titleInt;
    }

    public progress: number;
    private currentFileInt: string | undefined;
    private typeInt: MediaFileType;
    private startCallback: (() => Promise<void>) | undefined = undefined;
    private stopCallback: (() => void) | undefined = undefined;
    private titleInt: string | undefined;
    private stateInt: PlayerActivity = PlayerActivity.idle;

    public constructor() {
        this.currentFileInt = undefined;
        this.typeInt = MediaFileType.none;
        this.progress = 0;
        this.titleInt = undefined;
    }

    public async loadFile(
        filepath: string,
        type: MediaFileType,
        title: string,
        startCallback?: () => Promise<void>,
        stopCallback?: () => void,
    ) {
        this.titleInt = title;
        this.typeInt = type;
        this.currentFileInt = filepath;
        this.startCallback = startCallback;
        this.stopCallback = stopCallback;
        this.progress = 0;
        await commands.setSynth(type);
    }

    public async startPlaying(): Promise<void> {
        if (this.currentFile === null) {
            terminal.io.println("Please select a media file using drag&drop");
            return;
        }
        if (this.state !== PlayerActivity.idle) {
            terminal.io.println("A media file is currently playing, stop it before starting it again");
            return;
        }
        if (this.startCallback) {
            await this.startCallback();
        }
        this.stateInt = PlayerActivity.playing;
    }

    public stopPlaying(): void {
        midiOut.send(kill_msg);
        if (this.currentFile === null || this.state !== PlayerActivity.playing) {
            terminal.io.println("No media file is currently playing");
            return;
        }
        if (this.stopCallback) {
            this.stopCallback();
        }
        this.stateInt = PlayerActivity.idle;
        redrawMediaInfo();
        scripting.onMidiStopped();
    }
}


export let media_state = new PlayerState();

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
