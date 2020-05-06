import {ipcRenderer} from "electron";
import {IPCConstantsToMain} from "../../common/IPCConstantsToMain";
import {IPCConstantsToRenderer} from "../../common/IPCConstantsToRenderer";
import {ontime} from "../gui/sliders";

export namespace SlidersIPC {
    export function init() {
        ipcRenderer.on(IPCConstantsToRenderer.sliders.enableRelativeOntime, (ev, enable: boolean) => {
            ontime.setRelativeAllowed(enable);
        });
        ipcRenderer.on(IPCConstantsToRenderer.sliders.relativeOntime, (ev, val: number) => {
            ontime.setRelativeOntime(val);
        });
        ipcRenderer.on(IPCConstantsToRenderer.sliders.setOntimeToZero, () => {
            ontime.setToZero();
        });
    }

    export function setOntime(val: number) {
        ipcRenderer.send(IPCConstantsToMain.sliders.setOntime, val);
    }

    export function setBPS(val: number) {
        ipcRenderer.send(IPCConstantsToMain.sliders.setBPS, val);
    }

    export function setBurstOntime(val: number) {
        ipcRenderer.send(IPCConstantsToMain.sliders.setBurstOntime, val);
    }

    export function setBurstOfftime(val: number) {
        ipcRenderer.send(IPCConstantsToMain.sliders.setBurstOfftime, val);
    }
}
