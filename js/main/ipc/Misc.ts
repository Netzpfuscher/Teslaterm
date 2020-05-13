import {IPCConstantsToMain} from "../../common/IPCConstantsToMain";
import {IPCConstantsToRenderer} from "../../common/IPCConstantsToRenderer";
import {TTConfig} from "../../common/TTConfig";
import {config} from "../init";
import {playMidiData} from "../midi/midi";
import {processIPC} from "./IPCProvider";
import {MenuIPC} from "./Menu";
import {MetersIPC} from "./meters";
import {ScopeIPC} from "./Scope";
import {TerminalIPC} from "./terminal";

export module MiscIPC {
    export function openUDConfig(config: string[][], target: object) {
        processIPC.sendToWindow(IPCConstantsToRenderer.udConfig, target, config);
    }

    export function syncTTConfig(config: TTConfig, target: object) {
        processIPC.sendToWindow(IPCConstantsToRenderer.ttConfig, target, config);
    }

    export function init() {
        processIPC.on(IPCConstantsToMain.rendererReady, async (source: object) => {
            const terminalSuccessful = await TerminalIPC.setupTerminal(source);
            if (!terminalSuccessful) {
                TerminalIPC.println("No free terminal slot available. Will assign one when available.", source);
            }
            MenuIPC.sendFullState(source);
            ScopeIPC.sendConfig(source);
            MetersIPC.sendConfig(source);
            MiscIPC.syncTTConfig(config, source);
        });
        processIPC.on(IPCConstantsToMain.midiMessage, (source: object, msg: Uint8Array) => {
            playMidiData(msg);
        });
    }
}
