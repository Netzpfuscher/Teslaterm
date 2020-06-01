import {IPCConstantsToRenderer, MeterConfig, SetMeters} from "../../common/IPCConstantsToRenderer";
import {processIPC} from "./IPCProvider";

export module MetersIPC {
    let state: { [id: number]: number } = {};
    let lastState: { [id: number]: number } = {};
    const configs: Map<number, MeterConfig> = new Map();

    export function setValue(id: number, value: number) {
        state[id] = value;
    }

    export function configure(id: number, min: number, max: number, div: number, name: string) {
        const config = new MeterConfig(id, min, max, div, name);
        processIPC.sendToAll(IPCConstantsToRenderer.meters.configure, config);
        configs.set(id, config);
    }

    function tick() {
        let update: { [id: number]: number } = {};
        for (const [id, value] of Object.entries(state)) {
            if (lastState[id] !== value) {
                lastState[id] = value;
                update[id] = value;
            }
        }
        if (Object.keys(update).length > 0) {
            processIPC.sendToAll(IPCConstantsToRenderer.meters.setValue, new SetMeters(update));
        }
    }

    export function init() {
        setInterval(tick, 100);
    }

    export function sendConfig(source: object) {
        for (const cfg of configs.values()) {
            processIPC.sendToWindow(IPCConstantsToRenderer.meters.configure, source, cfg);
        }
    }
}
