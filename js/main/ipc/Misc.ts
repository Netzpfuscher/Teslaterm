import {IPCConstantsToMain} from "../../common/IPCConstantsToMain";
import {IPCConstantsToRenderer} from "../../common/IPCConstantsToRenderer";
import {processIPC} from "../../common/IPCProvider";
import {TTConfig} from "../../common/TTConfig";
import * as connection from "../connection/connection";
import {commands} from "../connection/connection";
import {config} from "../init";
import {playMidiData} from "../midi/midi";

export module MiscIPC {
    export function openUDConfig(config: string[][]) {
        processIPC.send(IPCConstantsToRenderer.udConfig, config);
    }

    export function syncTTConfig(config: TTConfig) {
        processIPC.send(IPCConstantsToRenderer.ttConfig, config);
    }

    export function init() {
        processIPC.on(IPCConstantsToMain.command, (cmd: string) => {
            commands.sendCommand(cmd);
        });
        processIPC.on(IPCConstantsToMain.rendererReady, () => {
            MiscIPC.syncTTConfig(config);
            connection.autoConnect();
        });
        processIPC.on(IPCConstantsToMain.midiMessage, (msg: Uint8Array) => {
            playMidiData(msg);
        });
    }
}
