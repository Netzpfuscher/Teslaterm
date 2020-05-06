import {IPCConstantsToMain, TransmittedFile} from "../../common/IPCConstantsToMain";
import {startBootloading} from "../connection/connection";
import * as media_player from "../media/media_player";
import {ScriptingIPC} from "./Scripting";
import {TerminalIPC} from "./terminal";
import {ipcMain, IpcMainEvent} from "electron";

export module FileUploadIPC {
    async function loadFile(event: IpcMainEvent, file: TransmittedFile) {
        const extension = file.name.substring(file.name.lastIndexOf(".") + 1);
        if (extension === "js") {
            ScriptingIPC.loadScript(file);
        } else if (extension === "cyacd") {
            if (!startBootloading(file.contents)) {
                TerminalIPC.println("Connection does not support bootloading");
            }
        } else {
            await media_player.loadMediaFile(file);
        }
    }

    export function init() {
        ipcMain.on(IPCConstantsToMain.loadFile, loadFile);
    }
}
