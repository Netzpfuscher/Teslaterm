import {checkTransientDisabled, MediaFileType, PlayerActivity} from "../media/media_player";
import * as connection from "../network/connection";
import {ConnectionState} from "../network/telemetry";
import {socket_midi} from "../network/connection";
import * as scope from "../gui/oscilloscope";
import {media_state, setMediaType} from "../midi/midi";
import {DumpSidSource} from "./sid_dump";
import {EmulationSidSource} from "./sid_emulated";

export class SidFrame extends Uint8Array {
    //TODO this isn't really working
    length: 25;
}

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
    let fs = new FileReader();
    await fs.readAsArrayBuffer(file);
    if (!(fs.result instanceof ArrayBuffer)) {
        console.error("SID dump not read as ArrayBuffer!");
        return;
    }
    const extension = file.name.substring(file.name.lastIndexOf(".")+1).toLowerCase();
    w2ui['toolbar'].get('mnu_midi').text = 'SID-File: '+file.name;
    w2ui['toolbar'].refresh();
    media_state.currentFile = file;
    setMediaType(MediaFileType.sid_dmp);
    if (extension=="dmp") {
        current_sid_source = new DumpSidSource(fs.result);
    } else if (extension=="sid") {
        current_sid_source = new EmulationSidSource(fs.result);
    } else {
        throw "Unknown extension "+extension;
    }
    scope.redrawMidiInfo();
}

export function update() {
    if(current_sid_source && media_state.state==PlayerActivity.playing && media_state.type==MediaFileType.sid_dmp
        && sending_sid){
        if(connection.connState==ConnectionState.CONNECTED_IP){
            checkTransientDisabled();
            if(socket_midi){
                for (let i = 0;i<2;++i) {
                    const real_frame = current_sid_source.next_frame();
                    const data = new Uint8Array(real_frame, 0, FRAME_LENGTH+4);
                    for (let j = FRAME_LENGTH;j<data.length;++j) {
                        data[j] = 0xFF;
                    }
                    chrome.sockets.tcp.send(socket_midi, data, () => {
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
            scope.redrawMidiInfo();
        }
    }
}

