import {IPCConstantsToMain} from "../../common/IPCConstantsToMain";
import {IPCConstantsToRenderer} from "../../common/IPCConstantsToRenderer";
import {TTConfig} from "../../common/TTConfig";
import * as connection from "../connection/connection";
import {commands} from "../connection/connection";
import {config, mainWindow} from "../main";
import {ipcMain} from "electron";
import {playMidiData} from "../midi/midi";

export module MiscIPC {
    export function openUDConfig(config: string[][]) {
        mainWindow.webContents.send(IPCConstantsToRenderer.udConfig, config);
    }

    export function syncTTConfig(config: TTConfig) {
        mainWindow.webContents.send(IPCConstantsToRenderer.ttConfig, config);
    }

    export function init() {
        ipcMain.on(IPCConstantsToMain.command, (ev, cmd: string) => {
            commands.sendCommand(cmd);
        });
        ipcMain.on(IPCConstantsToMain.rendererReady, () => {
            MiscIPC.syncTTConfig(config);
            connection.autoConnect();
        });
        ipcMain.on(IPCConstantsToMain.midiMessage, (ev, msg: Uint8Array) => {
            playMidiData(msg);
        });
    }
}
