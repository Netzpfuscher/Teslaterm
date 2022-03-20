import {IPCConstantsToMain, TransmittedFile} from "../../common/IPCConstantsToMain";
import {startBootloading} from "../connection/connection";
import * as media_player from "../media/media_player";
import {processIPC} from "./IPCProvider";
import {ScriptingIPC} from "./Scripting";
import {TerminalIPC} from "./terminal";
import {BlockSender} from "./block";

export module FileUploadIPC {
    async function loadFile(source: object, name: string, data: number[]) {
        const file = new TransmittedFile(name, new Uint8Array(data));
        const extension = file.name.substring(file.name.lastIndexOf(".") + 1);
        if (extension === "zip") {
            //TODO support plain JS scripts?
            await ScriptingIPC.loadScript(file);
        } else if (extension === "cyacd") {
            if (!startBootloading(file.contents)) {
                TerminalIPC.println("Connection does not support bootloading");
            }
        } else if (extension === "mcf") {
            await BlockSender.loadBlocks(file);
        } else {
            await media_player.loadMediaFile(file);
        }
    }

    export function init() {
        processIPC.on(IPCConstantsToMain.loadFile, loadFile);
    }
}
