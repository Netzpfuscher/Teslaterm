import {midi_state, player} from "./midi";


function readmidi(file){
    var fs = new FileReader();
    fs.readAsArrayBuffer(file);
    fs.onload = event_read_midi;
}

function event_read_midi(progressEvent){
    player.loadArrayBuffer(progressEvent.srcElement.result);
}



export function loadMidiFile(file) {
    w2ui['toolbar'].get('mnu_midi').text = 'MIDI-File: '+file.name;
    w2ui['toolbar'].refresh();
    midi_state.currentFile = file.name;
    readmidi(file);
}

export function loadSIDFile(file) {
    w2ui['toolbar'].get('mnu_midi').text = 'SID-File: '+file.name;
    w2ui['toolbar'].refresh();
    midi_state.currentFile = file.name;
    readSID(file);
}

function readSID(file){
    var fs = new FileReader();
    fs.readAsArrayBuffer(file);
    fs.onload = event_read_SID;
}
export let sid_file_marked;
let sid_state=0;
function event_read_SID(progressEvent){
    var cnt=0;
    var sid_file = new Uint8Array(progressEvent.srcElement.result.byteLength + ((progressEvent.srcElement.result.byteLength/25)*4));
    var source_cnt=0;
    var file = new Uint8Array(progressEvent.srcElement.result)
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
    sid_state=1;

}