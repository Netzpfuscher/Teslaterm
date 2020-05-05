import {IPCConstantsToRenderer, MeterConfig, SetMeter} from "../../common/IPCConstantsToRenderer";
import {mainWindow} from "../main";

export const Meters = {
    setValue: (id: number, value: number) => {
        mainWindow.webContents.send(IPCConstantsToRenderer.meters.setValue, new SetMeter(id, value));
    },
    configure: (id: number, min: number, max: number, name: string) => {
        mainWindow.webContents.send(IPCConstantsToRenderer.meters.configure, new MeterConfig(id, min, max, name));
    }
};
