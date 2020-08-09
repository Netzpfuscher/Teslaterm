import {ConfirmReply, IPCConstantsToMain, TransmittedFile} from "../../common/IPCConstantsToMain";
import {ConfirmationRequest, IPCConstantsToRenderer} from "../../common/IPCConstantsToRenderer";
import {Script} from "../scripting";
import * as scripting from "../scripting";
import {processIPC} from "./IPCProvider";
import {MenuIPC} from "./Menu";
import {TerminalIPC} from "./terminal";

export module ScriptingIPC {
    let currentScript: Script | null = null;
    let activeConfirmationID = 0;
    let confirmationResolve: (confirmed: boolean) => void;
    let confirmationReject: () => void;

    export async function startScript(source: object) {
        if (currentScript === null) {
            TerminalIPC.println("Please select a script file using drag&drop first");
        } else {
            await currentScript.start(source);
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

    export function requestConfirmation(key: object, msg: string, title?: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            if (confirmationReject) {
                confirmationReject();
            }
            if (processIPC.isValidWindow(key)) {
                ++activeConfirmationID;
                confirmationResolve = resolve;
                confirmationReject = reject;
                processIPC.sendToWindow(
                    IPCConstantsToRenderer.script.requestConfirm,
                    key,
                    new ConfirmationRequest(activeConfirmationID, msg, title)
                );
            } else {
                reject();
            }
        });
    }

    export function init() {
        processIPC.on(IPCConstantsToMain.script.confirmOrDeny, (src, msg: ConfirmReply) => {
            if (msg.requestID == activeConfirmationID && confirmationResolve) {
                confirmationResolve(msg.confirmed);
                confirmationReject = confirmationResolve = undefined;
            }
        });
        processIPC.on(IPCConstantsToMain.script.startScript, startScript);
        processIPC.on(IPCConstantsToMain.script.stopScript, stopScript);
    }
}
