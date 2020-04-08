import * as path from "path";
import * as scope from "../gui/oscilloscope/oscilloscope";
import * as helper from '../helper';
import {media_state, MediaFileType, setMediaType} from "../media/media_player";
import {player} from "./midi";

async function readmidi(file: string) {
    const content = await helper.readFileAsync(file);
    player.loadArrayBuffer(content);
}

export async function loadMidiFile(file: string) {
    const name = path.basename(file);
    w2ui.toolbar.get('mnu_midi').text = 'MIDI-File: ' + name;
    w2ui.toolbar.refresh();
    media_state.currentFile = file;
    media_state.title = name;
    setMediaType(MediaFileType.midi);
    await readmidi(file);
    scope.redrawMediaInfo();
}
