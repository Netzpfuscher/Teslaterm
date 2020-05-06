import {IPCConstantsToRenderer} from "../../common/IPCConstantsToRenderer";
import {IPCConstantsToMain} from "../../common/IPCConstantsToMain";
import {mainWindow} from "../main";
import {ipcMain} from "electron";

export module ConnectionUIIPC {
    export async function openConnectionUI(): Promise<Object> {
        return new Promise<any>((res, rej) => {
            ipcMain.once(IPCConstantsToMain.connect, (ev, args: Object) => {
                if (args !== null) {
                    res(args);
                } else {
                    rej();
                }
            });
            mainWindow.webContents.send(IPCConstantsToRenderer.openConnectionUI);
        });
    }
}
