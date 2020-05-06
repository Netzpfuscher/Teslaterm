import {IPCConstantsToMain} from "../../common/IPCConstantsToMain";
import {UD3State, IPCConstantsToRenderer} from "../../common/IPCConstantsToRenderer";
import {pressButton} from "../connection/connection";
import {mainWindow} from "../main";
import {media_state} from "../media/media_player";
import {ipcMain} from "electron";
import {ScriptingIPC} from "./Scripting";

export module MenuIPC {
    export function setBusState(active: boolean, controllable: boolean, transientActive: boolean) {
        mainWindow.webContents.send(IPCConstantsToRenderer.menu.ud3State, new UD3State(active, controllable, transientActive));
    }

    export function setConnectionButtonText(newText: string) {
        mainWindow.webContents.send(IPCConstantsToRenderer.menu.connectionButtonText, newText);
    }

    export function setScriptName(scriptName: string) {
        mainWindow.webContents.send(IPCConstantsToRenderer.menu.setScriptName, "Script: " + scriptName);
    }

    export function setMediaName(buttonText: string) {
        mainWindow.webContents.send(IPCConstantsToRenderer.menu.setMediaTitle, buttonText);
    }

    export function init() {
        ipcMain.on(IPCConstantsToMain.menu.startMedia, () => media_state.startPlaying());
        ipcMain.on(IPCConstantsToMain.menu.stopMedia, () => media_state.stopPlaying());
        ipcMain.on(IPCConstantsToMain.menu.startScript, ScriptingIPC.startScript);
        ipcMain.on(IPCConstantsToMain.menu.stopScript, ScriptingIPC.stopScript);
        ipcMain.on(IPCConstantsToMain.menu.connectButton, () => {
            pressButton();
        });
    }
}
