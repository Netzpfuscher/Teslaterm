import {IPCConstantsToRenderer} from "../../common/IPCConstantsToRenderer";
import {mainWindow} from "../main";

export module TerminalIPC {
    let buffer: string = "";

    export function print(s: string) {
        buffer += s;
    }

    export function println(s: string) {
        TerminalIPC.print(s + "\r\n");
    }

    function tick() {
        if (buffer !== "") {
            mainWindow.webContents.send(IPCConstantsToRenderer.terminal, buffer);
            buffer = "";
        }
    }

    export function init() {
        setInterval(tick, 20);
    }
}
