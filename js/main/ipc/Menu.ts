import {IPCConstantsToMain} from "../../common/IPCConstantsToMain";
import {UD3State, IPCConstantsToRenderer} from "../../common/IPCConstantsToRenderer";
import {commands, pressButton} from "../connection/connection";
import {configRequestQueue} from "../connection/telemetry/TelemetryFrame";
import {media_state} from "../media/media_player";
import {processIPC} from "./IPCProvider";
import {ScriptingIPC} from "./Scripting";

export module MenuIPC {
    let lastUD3State: UD3State = new UD3State(false, false, false);
    let lastConnectText: string = "Connect";
    let lastScriptName: string = "Script: none";
    let lastMediaName: string = "MIDI-File: none";

    export function setUD3State(active: boolean, controllable: boolean, transientActive: boolean) {
        lastUD3State = new UD3State(active, controllable, transientActive);
        processIPC.sendToAll(IPCConstantsToRenderer.menu.ud3State, lastUD3State);
    }

    export function setConnectionButtonText(newText: string) {
        processIPC.sendToAll(IPCConstantsToRenderer.menu.connectionButtonText, newText);
        lastConnectText = newText;
    }

    export function setScriptName(scriptName: string) {
        lastScriptName = "Script: " + scriptName;
        processIPC.sendToAll(IPCConstantsToRenderer.menu.setScriptName, lastScriptName);
    }

    export function setMediaName(buttonText: string) {
        processIPC.sendToAll(IPCConstantsToRenderer.menu.setMediaTitle, buttonText);
        lastMediaName = buttonText;
    }

    export function sendFullState(target: object) {
        processIPC.sendToWindow(IPCConstantsToRenderer.menu.ud3State, target, lastUD3State);
        processIPC.sendToWindow(IPCConstantsToRenderer.menu.connectionButtonText, target, lastConnectText);
        processIPC.sendToWindow(IPCConstantsToRenderer.menu.setScriptName, target, lastScriptName);
        processIPC.sendToWindow(IPCConstantsToRenderer.menu.setMediaTitle, target, lastMediaName);
    }

    export function init() {
        processIPC.on(IPCConstantsToMain.menu.startMedia, () => media_state.startPlaying());
        processIPC.on(IPCConstantsToMain.menu.stopMedia, () => media_state.stopPlaying());
        processIPC.on(IPCConstantsToMain.menu.startScript, ScriptingIPC.startScript);
        processIPC.on(IPCConstantsToMain.menu.stopScript, ScriptingIPC.stopScript);
        processIPC.on(IPCConstantsToMain.menu.connectButton, pressButton);
        processIPC.on(IPCConstantsToMain.menu.requestUDConfig, source => {
                configRequestQueue.push(source);
                commands.sendCommand("config_get\r");
            }
        );
    }
}
