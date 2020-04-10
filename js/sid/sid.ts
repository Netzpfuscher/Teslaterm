import * as microtime from "microtime";
import * as path from "path";
import * as scope from "../gui/oscilloscope/oscilloscope";
import {Endianness, readFileAsync, to_ud3_time} from "../helper";
import {checkTransientDisabled, isSID, media_state, MediaFileType, PlayerActivity} from "../media/media_player";
import * as connection from "../connection/connection";
import {FRAME_LENGTH, ISidSource} from "./sid_api";
import {DumpSidSource} from "./sid_dump";
import {EmulationSidSource} from "./sid_emulated";

export let current_sid_source: ISidSource | null = null;
export let sending_sid: boolean = true;

export function setSendingSID(newVal: boolean) {
    sending_sid = newVal;
}

let lastFrameTime: number;

async function startPlayingSID() {
    lastFrameTime = microtime.now();
    await connection.getUD3Connection().flushSynth();
}

async function stopPlayingSID() {
    setSendingSID(true);
    await loadSidFile(this.currentFile);
}

export async function loadSidFile(file: string) {
    const data = await readFileAsync(file);
    const extension = path.extname(file).substr(1).toLowerCase();
    const name = path.basename(file);
    w2ui.toolbar.get("mnu_midi").text = "SID-File: " + name;
    w2ui.toolbar.refresh();
    if (extension === "dmp") {
        current_sid_source = new DumpSidSource(data);
        media_state.loadFile(file, MediaFileType.sid_dmp, name, startPlayingSID, stopPlayingSID);
    } else if (extension === "sid") {
        const source_emulated = new EmulationSidSource(data);
        current_sid_source = source_emulated;
        media_state.loadFile(
            file,
            MediaFileType.sid_emulated,
            source_emulated.sid_info.title,
            startPlayingSID,
            stopPlayingSID,
        );
    } else {
        throw new Error("Unknown extension " + extension);
    }
    scope.redrawMediaInfo();
}

export function update() {
    if (current_sid_source && media_state.state === PlayerActivity.playing && isSID(media_state.type)
        && sending_sid) {
        checkTransientDisabled();
        if (connection.hasUD3Connection()) {
            for (let i = 0; i < 2 && !current_sid_source.isDone(); ++i) {
                const real_frame = current_sid_source.next_frame();
                console.assert(real_frame.length === FRAME_LENGTH);
                const data = new Buffer(FRAME_LENGTH + 4 + 4);
                for (let j = 0; j < FRAME_LENGTH; ++j) {
                    data[j] = real_frame[j];
                }
                lastFrameTime += 50e3;
                // Why did you decide to mix big and little endian, Jens???
                const ud_time = to_ud3_time(lastFrameTime, Endianness.LITTLE_ENDIAN);
                for (let j = 0; j < 4; ++j) {
                    data[j + FRAME_LENGTH] = ud_time[j];
                }
                for (let j = FRAME_LENGTH + 4; j < FRAME_LENGTH + 8; ++j) {
                    data[j] = 0xFF;
                }
                console.log(data);
                connection.getUD3Connection().sendMedia(data);
            }
        }
        const totalFrames = current_sid_source.getTotalFrameCount();
        if (totalFrames) {
            const currentFrames = current_sid_source.getCurrentFrameCount();
            media_state.progress = Math.floor(100 * currentFrames / totalFrames);
        }
        if (current_sid_source.isDone()) {
            media_state.stopPlaying();
        }
        scope.redrawMediaInfo();
    }
}
