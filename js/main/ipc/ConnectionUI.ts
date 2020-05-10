import {IPCConstantsToRenderer} from "../../common/IPCConstantsToRenderer";
import {IPCConstantsToMain} from "../../common/IPCConstantsToMain";
import {processIPC} from "../../common/IPCProvider";

export module ConnectionUIIPC {
    export async function openConnectionUI(): Promise<Object> {
        return new Promise<any>((res, rej) => {
            processIPC.once(IPCConstantsToMain.connect, (args: Object) => {
                if (args !== null) {
                    res(args);
                } else {
                    rej();
                }
            });
            processIPC.send(IPCConstantsToRenderer.openConnectionUI);
        });
    }
}
