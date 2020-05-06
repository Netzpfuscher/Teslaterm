import {IPCConstantsToRenderer} from "../../common/IPCConstantsToRenderer";
import {mainWindow} from "../main";

export module TerminalIPC {
    export function print(s: string) {
        mainWindow.webContents.send(IPCConstantsToRenderer.terminal, s);
    }

    export function println(s: string) {
        TerminalIPC.print(s + "\r\n");
    }
}
