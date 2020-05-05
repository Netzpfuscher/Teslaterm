import {IPCConstantsToRenderer} from "../../common/IPCConstantsToRenderer";
import {ConnectionReply, IPCConstantsToMain} from "../../common/IPCConstantsToMain";
import {mainWindow} from "../main";
import {ipcMain} from "electron";

export async function openConnectionUI(): Promise<Object> {
    return new Promise<any>((res, rej) => {
        ipcMain.once(IPCConstantsToMain.connect, (ev, args: ConnectionReply) => {
            console.log(args);
            res(args);
            return;
            //TODO
            if (args.cancel) {
                rej();
            } else {
            }
        });
        mainWindow.webContents.send(IPCConstantsToRenderer.openConnectionUI);
    });
}
