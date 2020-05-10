import {IPCConstantsToMain} from "../../common/IPCConstantsToMain";
import {UD3State, IPCConstantsToRenderer} from "../../common/IPCConstantsToRenderer";
import {pressButton} from "../connection/connection";
import {processIPC} from "../../common/IPCProvider";
import {media_state} from "../media/media_player";
import {ScriptingIPC} from "./Scripting";

export module MenuIPC {
    export function setBusState(active: boolean, controllable: boolean, transientActive: boolean) {
        processIPC.send(IPCConstantsToRenderer.menu.ud3State, new UD3State(active, controllable, transientActive));
    }

    export function setConnectionButtonText(newText: string) {
        processIPC.send(IPCConstantsToRenderer.menu.connectionButtonText, newText);
    }

    export function setScriptName(scriptName: string) {
        processIPC.send(IPCConstantsToRenderer.menu.setScriptName, "Script: " + scriptName);
    }

    export function setMediaName(buttonText: string) {
        processIPC.send(IPCConstantsToRenderer.menu.setMediaTitle, buttonText);
    }

    export function init() {
        processIPC.on(IPCConstantsToMain.menu.startMedia, () => media_state.startPlaying());
        processIPC.on(IPCConstantsToMain.menu.stopMedia, () => media_state.stopPlaying());
        processIPC.on(IPCConstantsToMain.menu.startScript, ScriptingIPC.startScript);
        processIPC.on(IPCConstantsToMain.menu.stopScript, ScriptingIPC.stopScript);
        processIPC.on(IPCConstantsToMain.menu.connectButton, () => {
            console.log("Connect btn");
            pressButton();
        });
    }
}
