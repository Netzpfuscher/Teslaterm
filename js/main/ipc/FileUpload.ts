import {IPCConstantsToMain, TransmittedFile} from "../../common/IPCConstantsToMain";
import {startBootloading} from "../connection/connection";
import * as media_player from "../media/media_player";
import * as scripting from "../scripting";
import {Menu} from "./Menu";
import {Terminal} from "./terminal";
import {ipcMain, IpcMainEvent} from "electron";

export let currentScript: Array<() => Promise<any>> = null;

async function loadFile(event: IpcMainEvent, file: TransmittedFile) {
    const extension = file.name.substring(file.name.lastIndexOf(".") + 1);
    if (extension === "js") {
        scripting.loadScript(file.contents)
            .then((script) => {
                currentScript = script;
                Menu.setScriptName(file.name);
            })
            .catch((err) => {
                Terminal.println("Failed to load script: " + err);
                console.log(err);
            });
    } else if (extension === "cyacd") {
        if (!startBootloading(file.contents)) {
            Terminal.println("Connection does not support bootloading");
        }
    } else {
        await media_player.loadMediaFile(file);
    }
}

function startScript(ev: IpcMainEvent) {
    if (currentScript === null) {
        Terminal.println("Please select a script file using drag&drop first");
    } else {
        scripting.startScript(currentScript);
    }
}

function stopScript(ev: IpcMainEvent) {
    if (currentScript === null) {
        Terminal.println("Please select a script file using drag&drop first");
    } else if (!scripting.isRunning()) {
        Terminal.println("The script can not be stopped since it isn't running");
    } else {
        scripting.cancel();
    }
}

export function init() {
    ipcMain.on(IPCConstantsToMain.loadFile, loadFile);
    ipcMain.on(IPCConstantsToMain.menu.startScript, startScript);
    ipcMain.on(IPCConstantsToMain.menu.stopScript, stopScript);
}
