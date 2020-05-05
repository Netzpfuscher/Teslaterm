import {IPCConstantsToMain} from "../../common/IPCConstantsToMain";
import {IPCConstantsToRenderer} from "../../common/IPCConstantsToRenderer";
import {mainWindow} from "../main";
import {ipcMain} from "electron";

class SliderValues {
    public ontime: number;
    public bps: number;
    public burstOntime: number;
    public burstOfftime: number;
}

export class Sliders {
    public static values = new SliderValues();

    public static setRelativeOntime(val: number) {
        mainWindow.webContents.send(IPCConstantsToRenderer.sliders.relativeOntime, val);
    }

    public static setRelativeAllowed(allowed: boolean) {
        mainWindow.webContents.send(IPCConstantsToRenderer.sliders.enableRelativeOntime, allowed);
    }

    public static setOntimeToZero() {
        mainWindow.webContents.send(IPCConstantsToRenderer.sliders.setOntimeToZero);
    }

    public static init() {
        ipcMain.on(IPCConstantsToMain.sliders.setOntime, (ev, value: number) => {
            Sliders.values.ontime = value;
        });
        ipcMain.on(IPCConstantsToMain.sliders.setBPS, (ev, value: number) => {
            Sliders.values.bps = value;
        });
        ipcMain.on(IPCConstantsToMain.sliders.setBurstOntime, (ev, value: number) => {
            Sliders.values.burstOntime = value;
        });
        ipcMain.on(IPCConstantsToMain.sliders.setBurstOfftime, (ev, value: number) => {
            Sliders.values.burstOfftime = value;
        });
    }
}
