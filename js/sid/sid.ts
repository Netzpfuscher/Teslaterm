import * as path from "path";
import * as scope from "../gui/oscilloscope/oscilloscope";
import {readFileAsync} from "../helper";
import {
    checkTransientDisabled,
    isSID,
    media_state,
    MediaFileType,
    PlayerActivity,
    setMediaType,
} from "../media/media_player";
import * as connection from "../network/connection";
import {FRAME_LENGTH, ISidSource} from "./sid_api";
import {DumpSidSource} from "./sid_dump";
import {EmulationSidSource} from "./sid_emulated";

export let current_sid_source: ISidSource | null = null;
export let sending_sid: boolean = true;

export function setSendingSID(newVal: boolean) {
    sending_sid = newVal;
}

export async function loadSidFile(file: string) {
    const data = await readFileAsync(file);
    const extension = path.extname(file).substr(1).toLowerCase();
    const name = path.basename(file);
    w2ui.toolbar.get("mnu_midi").text = "SID-File: " + name;
    w2ui.toolbar.refresh();
    media_state.currentFile = file;
    if (extension === "dmp") {
        current_sid_source = new DumpSidSource(data);
        media_state.title = name;
        setMediaType(MediaFileType.sid_dmp);
    } else if (extension === "sid") {
        const source_emulated = new EmulationSidSource(data);
        current_sid_source = source_emulated;
        media_state.title = source_emulated.sid_info.title;
        setMediaType(MediaFileType.sid_emulated);
    } else {
        throw new Error("Unknown extension " + extension);
    }
    scope.redrawMediaInfo();
}

export function update() {
    if (current_sid_source && media_state.state === PlayerActivity.playing && isSID(media_state.type)
        && sending_sid) {
        checkTransientDisabled();
        if (connection.connection) {
            for (let i = 0; i < 2 && !current_sid_source.isDone(); ++i) {
                const real_frame = current_sid_source.next_frame();
                console.assert(real_frame.length === FRAME_LENGTH);
                const data = new Buffer(FRAME_LENGTH + 4 + 4);
                for (let j = 0; j < FRAME_LENGTH; ++j) {
                    data[j] = real_frame[j];
                }
                for (let j = FRAME_LENGTH; j < FRAME_LENGTH + 4; ++j) {
                    data[j] = 0xFF;
                }
                for (let j = FRAME_LENGTH + 4; j < FRAME_LENGTH + 8; ++j) {
                    // TODO replace with timestamp
                    data[j] = 0xFF;
                }
                connection.connection.sendMedia(data);
            }
        }
        const totalFrames = current_sid_source.getTotalFrameCount();
        if (totalFrames) {
            const currentFrames = current_sid_source.getCurrentFrameCount();
            media_state.progress = Math.floor(100 * currentFrames / totalFrames);
        }
        if (current_sid_source.isDone()) {
            media_state.state = PlayerActivity.idle;
        }
        scope.redrawMediaInfo();
    }
}
