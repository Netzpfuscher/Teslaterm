import {IPCConstantsToRenderer, MeterConfig, SetMeters} from "../../common/IPCConstantsToRenderer";
import {mainWindow} from "../main";

export module MetersIPC {
    let state: { [id: number]: number } = {};
    let lastState: { [id: number]: number } = {};

    export function setValue(id: number, value: number) {
        state[id] = value;
    }

    export function configure(id: number, min: number, max: number, name: string) {
        mainWindow.webContents.send(IPCConstantsToRenderer.meters.configure, new MeterConfig(id, min, max, name));
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
            mainWindow.webContents.send(IPCConstantsToRenderer.meters.setValue, new SetMeters(update));
        }
    }

    export function init() {
        setInterval(tick, 100);
    }
}
