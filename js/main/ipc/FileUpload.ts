import {IPCConstantsToMain, TransmittedFile} from "../../common/IPCConstantsToMain";
import {processIPC} from "../../common/IPCProvider";
import {startBootloading} from "../connection/connection";
import * as media_player from "../media/media_player";
import {ScriptingIPC} from "./Scripting";
import {TerminalIPC} from "./terminal";

export module FileUploadIPC {
    async function loadFile(name: string, data: number[]) {
        const file = new TransmittedFile(name, new Uint8Array(data));
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
        processIPC.on(IPCConstantsToMain.loadFile, loadFile);
    }
}
