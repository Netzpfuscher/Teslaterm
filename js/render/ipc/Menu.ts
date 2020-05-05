import {ipcRenderer} from "electron";
import {IPCConstantsToMain} from "../../common/IPCConstantsToMain";
import {IPCConstantsToRenderer, UD3State} from "../../common/IPCConstantsToRenderer";
import {updateConnectionButton, updateUD3State} from "../gui/menu";

export let ud3State: UD3State;

export class Menu {
    public static startPlaying(): void {
        ipcRenderer.send(IPCConstantsToMain.menu.startMedia);
    }

    public static stopPlaying(): void {
        ipcRenderer.send(IPCConstantsToMain.menu.stopMedia);
    }

    public static startScript() {
        ipcRenderer.send(IPCConstantsToMain.menu.startScript);
    }

    public static stopScript() {
        ipcRenderer.send(IPCConstantsToMain.menu.stopScript);
    }

    public static connectButton() {
        ipcRenderer.send(IPCConstantsToMain.menu.connectButton);
    }

    public static init() {
        ipcRenderer.on(IPCConstantsToRenderer.menu.busState, (ev, state: UD3State) => {
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
