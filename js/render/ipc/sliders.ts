import {ipcRenderer} from "electron";
import {IPCConstantsToRenderer} from "../../common/IPCConstantsToRenderer";
import {ontime} from "../gui/sliders";

export class Sliders {
    public static init() {
        ipcRenderer.on(IPCConstantsToRenderer.sliders.enableRelativeOntime, (ev, enable: boolean) => {
            ontime.setRelativeAllowed(enable);
        });
        ipcRenderer.on(IPCConstantsToRenderer.sliders.relativeOntime, (ev, val: number) => {
            ontime.setRelativeOntime(val);
        });
        ipcRenderer.on(IPCConstantsToRenderer.sliders.setOntimeToZero, () => {
            ontime.setToZero();
        });
    }
}
