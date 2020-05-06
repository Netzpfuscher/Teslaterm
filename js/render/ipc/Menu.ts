import {ipcRenderer} from "electron";
import {IPCConstantsToMain} from "../../common/IPCConstantsToMain";
import {IPCConstantsToRenderer, UD3State} from "../../common/IPCConstantsToRenderer";
import {updateConnectionButton, updateUD3State} from "../gui/menu";

export let ud3State: UD3State;

export namespace MenuIPC {
    export function startPlaying(): void {
        ipcRenderer.send(IPCConstantsToMain.menu.startMedia);
    }

    export function stopPlaying(): void {
        ipcRenderer.send(IPCConstantsToMain.menu.stopMedia);
    }

    export function startScript() {
        ipcRenderer.send(IPCConstantsToMain.menu.startScript);
    }

    export function stopScript() {
        ipcRenderer.send(IPCConstantsToMain.menu.stopScript);
    }

    export function connectButton() {
        ipcRenderer.send(IPCConstantsToMain.menu.connectButton);
    }

    export function init() {
        ipcRenderer.on(IPCConstantsToRenderer.menu.ud3State, (ev, state: UD3State) => {
            updateUD3State(state);
            ud3State = state;
        });
        ipcRenderer.on(IPCConstantsToRenderer.menu.connectionButtonText, (ev, txt: string) => {
            updateConnectionButton(txt);
        });
        ipcRenderer.on(IPCConstantsToRenderer.menu.setMediaTitle, (ev, newTitle: string) => {
            w2ui.toolbar.get('mnu_midi').text = newTitle;
            w2ui.toolbar.refresh();
        });
        ipcRenderer.on(IPCConstantsToRenderer.menu.setScriptName, (ev, newName: string) => {
            w2ui.toolbar.get('mnu_script').text = newName;
            w2ui.toolbar.refresh();
        });
    }
}
