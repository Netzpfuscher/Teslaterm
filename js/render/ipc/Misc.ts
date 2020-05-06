import {ipcRenderer} from "electron";
import {ConnectionReply, IPCConstantsToMain} from "../../common/IPCConstantsToMain";
import {IPCConstantsToRenderer} from "../../common/IPCConstantsToRenderer";
import {TTConfig} from "../../common/TTConfig";
import {openUI} from "../gui/ConnectionUI";
import {terminal} from "../gui/constants";
import {ud_settings} from "../gui/UDConfig";

export let config: TTConfig = new TTConfig();

export namespace MiscIPC {

    export function init() {
        ipcRenderer.on(IPCConstantsToRenderer.terminal, (ev, s: string) => {
            terminal.io.print(s);
        });
        ipcRenderer.on(IPCConstantsToRenderer.ttConfig, (ev, cfg: TTConfig) => {
            config = cfg;
        });
        ipcRenderer.on(IPCConstantsToRenderer.udConfig, (ev, cfg: string[][]) => {
            ud_settings(cfg);
        });
        ipcRenderer.on(IPCConstantsToRenderer.openConnectionUI, async (ev) => {
            let reply: Object | null;
            try {
                reply = await openUI();
            } catch (e) {
                reply = null;
            }
            ipcRenderer.send(IPCConstantsToMain.connect, reply);
        });
        ipcRenderer.send(IPCConstantsToMain.rendererReady);
    }
}
