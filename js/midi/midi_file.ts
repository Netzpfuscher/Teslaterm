import {media_state, player, setMediaType} from "./midi";
import * as scope from "../gui/oscilloscope";
import {MediaFileType} from "../media/media_player";

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
    setMediaType(MediaFileType.midi);
    readmidi(file);
    scope.redrawMidiInfo();

}
