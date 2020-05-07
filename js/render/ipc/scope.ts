import {ipcRenderer} from "electron";
import {
    IPCConstantsToRenderer, MediaState,
    ScopeLine,
    ScopeText,
    ScopeTraceConfig, ScopeValues
} from "../../common/IPCConstantsToRenderer";
import {
    beginControlledDraw,
    drawChart,
    drawLine,
    drawString,
    redrawInfo,
    redrawMediaInfo,
    traces
} from "../gui/oscilloscope/oscilloscope";

export namespace ScopeIPC {
    export function init() {
        ipcRenderer.on(IPCConstantsToRenderer.scope.refresh, () => {
            redrawInfo();
        });
        ipcRenderer.on(IPCConstantsToRenderer.scope.configure, (ev, cfg: ScopeTraceConfig) => {
            traces[cfg.id].configure(cfg.min, cfg.max, cfg.offset, cfg.unit, cfg.name);
        });
        ipcRenderer.on(IPCConstantsToRenderer.scope.addValues, (ev, cfg: ScopeValues) => {
            for (const tick of cfg.values) {
                for (const [id, val] of Object.entries(tick)) {
                    traces[id].addValue(val);
                }
                drawChart();
            }
        });
        ipcRenderer.on(IPCConstantsToRenderer.scope.startControlled, () => {
            beginControlledDraw();
        });
        ipcRenderer.on(IPCConstantsToRenderer.scope.drawLine, (ev, cfg: ScopeLine) => {
            drawLine(cfg.x1, cfg.y1, cfg.x2, cfg.y2, cfg.color);
        });
        ipcRenderer.on(IPCConstantsToRenderer.scope.drawString, (ev, cfg: ScopeText) => {
            drawString(cfg.x, cfg.y, cfg.color, cfg.size, cfg.str, cfg.center);
        });
        ipcRenderer.on(IPCConstantsToRenderer.scope.redrawMedia, (ev, state: MediaState) => {
            redrawMediaInfo(state);
        });
    }
}
