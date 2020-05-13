import {processIPC} from "./IPCProvider";
import {IPCConstantsToRenderer, MeterConfig, SetMeters} from "../../common/IPCConstantsToRenderer";
import {meters} from "../gui/gauges";

export namespace MetersIPC {
    export function init() {
        processIPC.on(IPCConstantsToRenderer.meters.configure, (cfg: MeterConfig) => {
            meters[cfg.meterId].range(cfg.min, cfg.max);
            meters[cfg.meterId].text(cfg.name);
        });
        processIPC.on(IPCConstantsToRenderer.meters.setValue, (cfg: SetMeters) => {
            for (const [id, value] of Object.entries(cfg.values)) {
                meters[id].value(value);
            }
        });
    }
}
