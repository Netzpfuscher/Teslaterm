import {processIPC} from "../../common/IPCProvider";
import {IPCConstantsToMain} from "../../common/IPCConstantsToMain";
import {IPCConstantsToRenderer} from "../../common/IPCConstantsToRenderer";
import {ontime} from "../gui/sliders";

export namespace SlidersIPC {
    export function init() {
        processIPC.on(IPCConstantsToRenderer.sliders.enableRelativeOntime, (enable: boolean) => {
            ontime.setRelativeAllowed(enable);
        });
        processIPC.on(IPCConstantsToRenderer.sliders.relativeOntime, (val: number) => {
            ontime.setRelativeOntime(val);
        });
        processIPC.on(IPCConstantsToRenderer.sliders.setOntimeToZero, () => {
            ontime.setToZero();
        });
    }

    export function setOntime(val: number) {
        processIPC.send(IPCConstantsToMain.sliders.setOntime, val);
    }

    export function setBPS(val: number) {
        processIPC.send(IPCConstantsToMain.sliders.setBPS, val);
    }

    export function setBurstOntime(val: number) {
        processIPC.send(IPCConstantsToMain.sliders.setBurstOntime, val);
    }

    export function setBurstOfftime(val: number) {
        processIPC.send(IPCConstantsToMain.sliders.setBurstOfftime, val);
    }
}
