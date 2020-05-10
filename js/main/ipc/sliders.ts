import {IPCConstantsToMain} from "../../common/IPCConstantsToMain";
import {IPCConstantsToRenderer} from "../../common/IPCConstantsToRenderer";
import {commands} from "../connection/connection";
import {processIPC} from "../../common/IPCProvider";

export module Sliders {
    export class SliderValues {
        public ontime: number;
        public bps: number;
        public burstOntime: number;
        public burstOfftime: number;
    }

    export let values = new SliderValues();

    export function setRelativeOntime(val: number) {
        processIPC.send(IPCConstantsToRenderer.sliders.relativeOntime, val);
    }

    export function setRelativeAllowed(allowed: boolean) {
        processIPC.send(IPCConstantsToRenderer.sliders.enableRelativeOntime, allowed);
    }

    export function setOntimeToZero() {
        processIPC.send(IPCConstantsToRenderer.sliders.setOntimeToZero);
    }

    export function init() {
        processIPC.on(IPCConstantsToMain.sliders.setOntime, (value: number) => {
            Sliders.values.ontime = value;
            commands.setOntime(value);
        });
        processIPC.on(IPCConstantsToMain.sliders.setBPS, (value: number) => {
            Sliders.values.bps = value;
            commands.setBPS(value);
        });
        processIPC.on(IPCConstantsToMain.sliders.setBurstOntime, (value: number) => {
            Sliders.values.burstOntime = value;
            commands.setBurstOntime(value);
        });
        processIPC.on(IPCConstantsToMain.sliders.setBurstOfftime, (value: number) => {
            Sliders.values.burstOfftime = value;
            commands.setBurstOfftime(value);
        });
    }
}
