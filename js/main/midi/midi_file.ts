import {MediaFileType} from "../../common/CommonTypes";
import {TransmittedFile} from "../../common/IPCConstantsToMain";
import {MenuIPC} from "../ipc/Menu";
import {ScopeIPC} from "../ipc/Scope";
import {media_state} from "../media/media_player";
import {player, startCurrentMidiFile, stopMidiFile} from "./midi";

export async function loadMidiFile(file: TransmittedFile) {
    MenuIPC.setMediaName('MIDI-File: ' + file.name.substring(0, file.name.length - 4));
    await media_state.loadFile(
        file,
        MediaFileType.midi,
        name,
        startCurrentMidiFile,
        stopMidiFile,
    );
    player.loadArrayBuffer(file.contents);
    ScopeIPC.updateMediaInfo();
}
