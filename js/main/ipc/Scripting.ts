import {TransmittedFile} from "../../common/IPCConstantsToMain";
import * as scripting from "../scripting";
import {MenuIPC} from "./Menu";
import {TerminalIPC} from "./terminal";

export module ScriptingIPC {
    let currentScript: Array<() => Promise<any>> = null;

    export function startScript() {
        if (currentScript === null) {
            TerminalIPC.println("Please select a script file using drag&drop first");
        } else {
            scripting.startScript(currentScript);
        }
    }

    export function stopScript() {
        if (currentScript === null) {
            TerminalIPC.println("Please select a script file using drag&drop first");
        } else if (!scripting.isRunning()) {
            TerminalIPC.println("The script can not be stopped since it isn't running");
        } else {
            scripting.cancel();
        }
    }

    export function loadScript(file: TransmittedFile) {
        scripting.loadScript(file.contents)
            .then((script) => {
                currentScript = script;
                MenuIPC.setScriptName(file.name);
            })
            .catch((err) => {
                TerminalIPC.println("Failed to load script: " + err);
                console.log(err);
            });
    }
}
