import {IPCConstantsToMain} from "../../common/IPCConstantsToMain";
import {IPCConstantsToRenderer} from "../../common/IPCConstantsToRenderer";
import {commands} from "../connection/connection";
import {processIPC} from "./IPCProvider";

export module Sliders {
    export class SliderValues {
        public ontime: number;
        public bps: number;
        public burstOntime: number;
        public burstOfftime: number;
    }

    export let values = new SliderValues();

    export function setRelativeOntime(val: number) {
        processIPC.sendToAll(IPCConstantsToRenderer.sliders.relativeOntime, val);
    }

    export function setRelativeAllowed(allowed: boolean) {
        processIPC.sendToAll(IPCConstantsToRenderer.sliders.enableRelativeOntime, allowed);
    }

    export function setOntimeToZero() {
        processIPC.sendToAll(IPCConstantsToRenderer.sliders.setOntimeToZero);
    }

    export function init() {
        //TODO move sliders in other windows, and on connect
        processIPC.on(IPCConstantsToMain.sliders.setOntime, (source, value: number) => {
            Sliders.values.ontime = value;
            commands.setOntime(value);
        });
        processIPC.on(IPCConstantsToMain.sliders.setBPS, (source, value: number) => {
            Sliders.values.bps = value;
            commands.setBPS(value);
        });
        processIPC.on(IPCConstantsToMain.sliders.setBurstOntime, (source, value: number) => {
            Sliders.values.burstOntime = value;
            commands.setBurstOntime(value);
        });
        processIPC.on(IPCConstantsToMain.sliders.setBurstOfftime, (source, value: number) => {
            Sliders.values.burstOfftime = value;
            commands.setBurstOfftime(value);
        });
    }
}
