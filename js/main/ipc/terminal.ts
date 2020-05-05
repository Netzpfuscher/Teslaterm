import {IPCConstantsToRenderer} from "../../common/IPCConstantsToRenderer";
import {mainWindow} from "../main";

export const Terminal = {
    print(s: string) {
        mainWindow.webContents.send(IPCConstantsToRenderer.terminal, s);
    },
    println(s: string) {
        Terminal.print(s + "\r\n");
    }
};
