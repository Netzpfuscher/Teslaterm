import {IPCConstantsToMain} from "../../common/IPCConstantsToMain";
import {IPCConstantsToRenderer} from "../../common/IPCConstantsToRenderer";
import {commands} from "../connection/connection";
import {mainWindow} from "../main";
import {ipcMain} from "electron";

export module Sliders {
    export class SliderValues {
        public ontime: number;
        public bps: number;
        public burstOntime: number;
        public burstOfftime: number;
    }

    export let values = new SliderValues();

    export function setRelativeOntime(val: number) {
        mainWindow.webContents.send(IPCConstantsToRenderer.sliders.relativeOntime, val);
    }

    export function setRelativeAllowed(allowed: boolean) {
        mainWindow.webContents.send(IPCConstantsToRenderer.sliders.enableRelativeOntime, allowed);
    }

    export function setOntimeToZero() {
        mainWindow.webContents.send(IPCConstantsToRenderer.sliders.setOntimeToZero);
    }

    export function init() {
        ipcMain.on(IPCConstantsToMain.sliders.setOntime, (ev, value: number) => {
            Sliders.values.ontime = value;
            commands.setOntime(value);
        });
        ipcMain.on(IPCConstantsToMain.sliders.setBPS, (ev, value: number) => {
            Sliders.values.bps = value;
            commands.setBPS(value);
        });
        ipcMain.on(IPCConstantsToMain.sliders.setBurstOntime, (ev, value: number) => {
            Sliders.values.burstOntime = value;
            commands.setBurstOntime(value);
        });
        ipcMain.on(IPCConstantsToMain.sliders.setBurstOfftime, (ev, value: number) => {
            Sliders.values.burstOfftime = value;
            commands.setBurstOfftime(value);
        });
    }
}
