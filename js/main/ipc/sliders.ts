import {IPCConstantsToMain} from "../../common/IPCConstantsToMain";
import {IPCConstantsToRenderer, SliderState} from "../../common/IPCConstantsToRenderer";
import {commands} from "../connection/connection";
import {processIPC} from "./IPCProvider";

export module SlidersIPC {
    export let state = new SliderState();

    export async function setAbsoluteOntime(val: number, key?: object) {
        state.ontimeAbs = val;
        await commands.setOntime(state.ontime);
        sendSliderSync(key);
    }

    export async function setRelativeOntime(val: number, key?: object) {
        state.ontimeRel = val;
        await commands.setOntime(state.ontime);
        sendSliderSync(key);
    }

    export async function setBPS(val: number, key?: object) {
        state.bps = val;
        await commands.setBPS(val);
        sendSliderSync(key);
    }

    export async function setBurstOntime(val: number, key?: object) {
        state.burstOntime = val;
        await commands.setBurstOntime(val);
        sendSliderSync(key);
    }

    export async function setBurstOfftime(val: number, key?: object) {
        state.burstOfftime = val;
        await commands.setBurstOfftime(val);
        sendSliderSync(key);
    }

    export function setRelativeAllowed(allowed: boolean, key?: object) {
        state.relativeAllowed = allowed;
        sendSliderSync(key);
    }

    function sendSliderSync(connection?: object) {
        //TODO s delta, if this proves to be too slow
        processIPC.sendToAllExcept(IPCConstantsToRenderer.sliders.syncSettings, connection, state);
    }

    function callSwapped(f: (val: number, key: object) => Promise<any>) {
        return (key: object, val: number) => {
            f(val, key)
                .catch((r) => {
                    console.log("Error while sending command: ", r);
                });
        };
    }

    export function init() {
        processIPC.on(IPCConstantsToMain.sliders.setOntimeAbsolute, callSwapped(setAbsoluteOntime));
        processIPC.on(IPCConstantsToMain.sliders.setOntimeRelative, callSwapped(setRelativeOntime));
        processIPC.on(IPCConstantsToMain.sliders.setBPS, callSwapped(setBPS));
        processIPC.on(IPCConstantsToMain.sliders.setBurstOntime, callSwapped(setBurstOntime));
        processIPC.on(IPCConstantsToMain.sliders.setBurstOfftime, callSwapped(setBurstOfftime));
    }
}
