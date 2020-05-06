import {ipcRenderer} from "electron";
import {IPCConstantsToRenderer, MeterConfig, SetMeter} from "../../common/IPCConstantsToRenderer";
import {meters} from "../gui/gauges";

export namespace MetersIPC {
    export function init() {
        ipcRenderer.on(IPCConstantsToRenderer.meters.configure, (ev, cfg: MeterConfig) => {
            meters[cfg.meterId].range(cfg.min, cfg.max);
            meters[cfg.meterId].text(cfg.name);
        });
        ipcRenderer.on(IPCConstantsToRenderer.meters.setValue, (ev, cfg: SetMeter) => {
            meters[cfg.meterId].value(cfg.value);
        });
    }
}
