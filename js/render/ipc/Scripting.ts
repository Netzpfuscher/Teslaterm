import {ConfirmReply, IPCConstantsToMain} from "../../common/IPCConstantsToMain";
import {ConfirmationRequest, IPCConstantsToRenderer} from "../../common/IPCConstantsToRenderer";
import {confirmPromise} from "../gui/ui_helper";
import {processIPC} from "./IPCProvider";

export module ScriptingIPC {
    export function startScript() {
        processIPC.send(IPCConstantsToMain.script.startScript);
    }

    export function stopScript() {
        processIPC.send(IPCConstantsToMain.script.stopScript);
    }

    export function init() {
        processIPC.on(IPCConstantsToRenderer.script.requestConfirm, async (msg: ConfirmationRequest) => {
            const accepted = await confirmPromise(msg.message, msg.title);
            processIPC.send(IPCConstantsToMain.script.confirmOrDeny, new ConfirmReply(accepted, msg.confirmationID));
        });
    }
}
