import {TransmittedFile} from "../../common/IPCConstantsToMain";
import {Script} from "../scripting";
import * as scripting from "../scripting";
import {MenuIPC} from "./Menu";
import {TerminalIPC} from "./terminal";

export module ScriptingIPC {
    let currentScript: Script | null = null;

    export function startScript() {
        if (currentScript === null) {
            TerminalIPC.println("Please select a script file using drag&drop first");
        } else {
            currentScript.start();
        }
    }

    export function stopScript() {
        if (currentScript === null) {
            TerminalIPC.println("Please select a script file using drag&drop first");
        } else if (!currentScript.isRunning()) {
            TerminalIPC.println("The script can not be stopped since it isn't running");
        } else {
            currentScript.cancel();
        }
    }

    export async function loadScript(file: TransmittedFile) {
        try {
            currentScript = await Script.create(file.contents);
            MenuIPC.setScriptName(file.name);
        } catch (e) {
            TerminalIPC.println("Failed to load script: " + e);
            console.log(e);
        }
    }
}
