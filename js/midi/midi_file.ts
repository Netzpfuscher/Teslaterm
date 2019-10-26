import {media_state, MediaFileType, player, setSidState, SidState} from "./midi";
import * as scope from "../gui/oscilloscope";

function readmidi(file){
    var fs = new FileReader();
    fs.readAsArrayBuffer(file);
    fs.onload = event_read_midi;
}

function event_read_midi(this: FileReader, progressEvent: ProgressEvent){
    if (!(this.result instanceof ArrayBuffer)) {
        console.error("MIDI not read as ArrayBuffer!");
        return;
    }
    player.loadArrayBuffer(this.result);
}

export function loadMidiFile(file) {
    w2ui['toolbar'].get('mnu_midi').text = 'MIDI-File: '+file.name;
    w2ui['toolbar'].refresh();
    media_state.currentFile = file.name;
    media_state.type = MediaFileType.midi;
    readmidi(file);
    scope.redrawMidiInfo();

}

export function loadSIDFile(file) {
    w2ui['toolbar'].get('mnu_midi').text = 'SID-File: '+file.name;
    w2ui['toolbar'].refresh();
    media_state.currentFile = file.name;
    media_state.type = MediaFileType.sid_dmp;
    readSID(file);
    scope.redrawMidiInfo();
}

function readSID(file){
    let fs = new FileReader();
    fs.onload = event_read_SID;
    fs.readAsArrayBuffer(file);
}
export let sid_file_marked;
function event_read_SID(this: FileReader, progressEvent: ProgressEvent){
    if (!(this.result instanceof ArrayBuffer)) {
        console.error("SID dump not read as ArrayBuffer!");
        return;
    }
    let cnt=0;
    let sid_file = new Uint8Array(this.result.byteLength + ((this.result.byteLength/25)*4));
    let source_cnt=0;
    let file = new Uint8Array(this.result);
    sid_file[cnt++] = 0xFF;
    sid_file[cnt++] = 0xFF;
    sid_file[cnt++] = 0xFF;
    sid_file[cnt++] = 0xFF;


    while(source_cnt<file.byteLength){
        sid_file[cnt++]=file[source_cnt++];
        if(!(source_cnt%25)){
            sid_file[cnt++] = 0xFF;
            sid_file[cnt++] = 0xFF;
            sid_file[cnt++] = 0xFF;
            sid_file[cnt++] = 0xFF;
        }
    }
    sid_file_marked=sid_file;
    setSidState(SidState.loaded);
}