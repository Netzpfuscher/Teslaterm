import {IPCConstantsToMain} from "../../common/IPCConstantsToMain";
import {IPCConstantsToRenderer} from "../../common/IPCConstantsToRenderer";
import {TTConfig} from "../../common/TTConfig";
import {commands, pressButton} from "../connection/connection";
import {mainWindow} from "../main";
import {ipcMain} from "electron";

export class Misc {
    public static openUDConfig(config: string[][]) {
        mainWindow.webContents.send(IPCConstantsToRenderer.udConfig, config);
    }

    public static syncTTConfig(config: TTConfig) {
        mainWindow.webContents.send(IPCConstantsToRenderer.ttConfig, config);
    }

    public static init() {
        ipcMain.on(IPCConstantsToMain.command, (ev, cmd: string) => {
            commands.sendCommand(cmd);
        });
        ipcMain.on(IPCConstantsToMain.menu.connectButton, () => {
            pressButton();
        });
    }
}
