import * as path from "path";
import * as scope from "../gui/oscilloscope/oscilloscope";
import {Endianness, readFileAsync, to_ud3_time} from "../helper";
import {checkTransientDisabled, isSID, media_state, MediaFileType, PlayerActivity} from "../media/media_player";
import * as connection from "../connection/connection";
import {FRAME_LENGTH, ISidSource} from "./sid_api";
import {DumpSidSource} from "./sid_dump";
import {EmulationSidSource} from "./sid_emulated";

let current_sid_source: ISidSource | null = null;

async function startPlayingSID() {
    const sidConnection = connection.getUD3Connection().getSidConnection();
    await sidConnection.flush();
    sidConnection.onStart();
}

async function stopPlayingSID() {
    await loadSidFile(media_state.currentFile);
}

export async function loadSidFile(file: string) {
    const data = await readFileAsync(file);
    const extension = path.extname(file).substr(1).toLowerCase();
    const name = path.basename(file);
    w2ui.toolbar.get("mnu_midi").text = "SID-File: " + name;
    w2ui.toolbar.refresh();
    if (extension === "dmp") {
        current_sid_source = new DumpSidSource(data);
        await media_state.loadFile(file, MediaFileType.sid_dmp, name, startPlayingSID, stopPlayingSID);
    } else if (extension === "sid") {
        const source_emulated = new EmulationSidSource(data);
        current_sid_source = source_emulated;
        await media_state.loadFile(
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
    if (!connection.hasUD3Connection()) {
        return;
    }
    const sidConnection = connection.getUD3Connection().getSidConnection();
    if (current_sid_source && media_state.state === PlayerActivity.playing && isSID(media_state.type)
        && !sidConnection.isBusy()) {
        checkTransientDisabled();
        if (connection.hasUD3Connection()) {
            for (let i = 0; i < 2 && !current_sid_source.isDone(); ++i) {
                const real_frame = current_sid_source.next_frame();
                sidConnection.processFrame(real_frame, 5e4);
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
