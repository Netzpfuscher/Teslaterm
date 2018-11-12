import {checkTransientDisabled, isSID, MediaFileType, PlayerActivity} from "../media/media_player";
import * as connection from "../network/connection";
import {ConnectionState} from "../network/telemetry";
import {mediaSocket} from "../network/connection";
import * as scope from "../gui/oscilloscope";
import {media_state, setMediaType} from "../midi/midi";
import {DumpSidSource} from "./sid_dump";
import {EmulationSidSource} from "./sid_emulated";
import {readFileAsync} from "../helper";
import {simulated} from "../init";

export type SidFrame = Uint8Array;

export interface SidSource {
    next_frame(): SidFrame;
    getTotalFrameCount(): number | null;
    getCurrentFrameCount(): number;
    isDone(): boolean;
}

export let current_sid_source: SidSource | null = null;
export let sending_sid: boolean = true;
export const FRAME_LENGTH = 25;

export function setSendingSID(newVal: boolean) {
    sending_sid = newVal;
}

export async function loadSidFile(file: File) {
    const data = await readFileAsync(file);
    const extension = file.name.substring(file.name.lastIndexOf(".")+1).toLowerCase();
    w2ui['toolbar'].get('mnu_midi').text = 'SID-File: '+file.name;
    w2ui['toolbar'].refresh();
    media_state.currentFile = file;
    if (extension=="dmp") {
        current_sid_source = new DumpSidSource(data);
        media_state.title = file.name;
        setMediaType(MediaFileType.sid_dmp);
    } else if (extension=="sid") {
        const source_emulated = new EmulationSidSource(data);
        current_sid_source = source_emulated;
        media_state.title = source_emulated.sid_info.title;
        setMediaType(MediaFileType.sid_emulated);
    } else {
        throw "Unknown extension "+extension;
    }
    scope.redrawMediaInfo();
}

export function update() {
    if(current_sid_source && media_state.state==PlayerActivity.playing && isSID(media_state.type)
        && sending_sid){
        if(simulated||connection.connState==ConnectionState.CONNECTED_IP){
            checkTransientDisabled();
            if (mediaSocket) {
                for (let i = 0; i < 2; ++i) {
                    const real_frame = current_sid_source.next_frame();
                    console.assert(real_frame.length == FRAME_LENGTH);
                    const data = new Uint8Array(FRAME_LENGTH + 4);
                    for (let j = 0; j < FRAME_LENGTH; ++j) {
                        data[j] = real_frame[j];
                    }
                    for (let j = FRAME_LENGTH; j < data.length; ++j) {
                        data[j] = 0xFF;
                    }
                    chrome.sockets.tcp.send(mediaSocket, data, () => {
                        if (chrome.runtime.lastError) {
                            console.log("Failed to send SID data: " + chrome.runtime.lastError.message);
                        }
                    });
                }
            }
            const totalFrames = current_sid_source.getTotalFrameCount();
            if (totalFrames) {
                const currentFrames = current_sid_source.getCurrentFrameCount();
                media_state.progress = Math.floor(100 * currentFrames / totalFrames);
            }
            if(current_sid_source.isDone()){
                media_state.state = PlayerActivity.idle;
            }
            scope.redrawMediaInfo();
        }
    }
}
