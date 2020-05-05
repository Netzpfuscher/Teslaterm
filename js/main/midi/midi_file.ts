import {MediaFileType} from "../../common/CommonTypes";
import {TransmittedFile} from "../../common/IPCConstantsToMain";
import {Menu} from "../ipc/Menu";
import {Scope} from "../ipc/Scope";
import {media_state} from "../media/media_player";
import {player, startCurrentMidiFile, stopMidiFile} from "./midi";

export async function loadMidiFile(file: TransmittedFile) {
    Menu.setMediaName('MIDI-File: ' + file.name.substring(0, file.name.length - 4));
    await media_state.loadFile(
        file,
        MediaFileType.midi,
        name,
        startCurrentMidiFile,
        stopMidiFile,
    );
    player.loadArrayBuffer(file.contents);
    Scope.updateMediaInfo();
}
