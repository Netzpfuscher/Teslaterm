import {IPCConstantsToRenderer, MeterConfig, SetMeter} from "../../common/IPCConstantsToRenderer";
import {mainWindow} from "../main";

export module MetersIPC {
    export function setValue(id: number, value: number) {
        mainWindow.webContents.send(IPCConstantsToRenderer.meters.setValue, new SetMeter(id, value));
    }

    export function configure(id: number, min: number, max: number, name: string) {
        mainWindow.webContents.send(IPCConstantsToRenderer.meters.configure, new MeterConfig(id, min, max, name));
    }
}
