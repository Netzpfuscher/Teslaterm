import {processIPC} from "./IPCProvider";
import {IPCConstantsToMain} from "../../common/IPCConstantsToMain";
import {IPCConstantsToRenderer, SliderState} from "../../common/IPCConstantsToRenderer";
import {ontime, updateSliderState} from "../gui/sliders";

export namespace SlidersIPC {
    export function init() {
        processIPC.on(IPCConstantsToRenderer.sliders.syncSettings, updateSliderState);
    }

    export function setRelativeOntime(val: number) {
        processIPC.send(IPCConstantsToMain.sliders.setOntimeRelative, val);
    }

    export function setAbsoluteOntime(val: number) {
        processIPC.send(IPCConstantsToMain.sliders.setOntimeAbsolute, val);
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
