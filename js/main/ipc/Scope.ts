import {
    IPCConstantsToRenderer,
    ScopeLine,
    ScopeText,
    ScopeTraceConfig,
    ScopeValues
} from "../../common/IPCConstantsToRenderer";
import {MediaState} from "../../common/IPCConstantsToRenderer";
import {media_state} from "../media/media_player";
import {processIPC} from "./IPCProvider";

export module ScopeIPC {
    let tickSummary: { [id: number]: number }[] = [];
    let sinceLastDraw: { [id: number]: number } = {};
    let configs: Map<number, ScopeTraceConfig> = new Map();

    export function refresh() {
        processIPC.sendToAll(IPCConstantsToRenderer.scope.refresh);
    }

    export function drawChart() {
        tickSummary.push(sinceLastDraw);
        sinceLastDraw = {};
    }

    export function addValue(traceId: number, value: number) {
        sinceLastDraw[traceId] = value;
    }

    export function startControlledDraw(source?: object) {
        processIPC.sendToWindow(IPCConstantsToRenderer.scope.startControlled, source);
    }

    export function drawLine(x1: number, y1: number, x2: number, y2: number, color: number, source?: object) {
        processIPC.sendToWindow(IPCConstantsToRenderer.scope.drawLine, source, new ScopeLine(x1, y1, x2, y2, color));
    }

    export function drawText(x: number, y: number, color: number, size: number, str: string, center: boolean, source?: object) {
        processIPC.sendToWindow(IPCConstantsToRenderer.scope.drawString, source, new ScopeText(x, y, color, size, str, center));
    }

    export function configure(traceId: number, min: number, max: number, offset: number, unit: string, name: string) {
        const config = new ScopeTraceConfig(traceId, min, max, offset, unit, name);
        processIPC.sendToAll(IPCConstantsToRenderer.scope.configure, config);
        configs.set(traceId, config);
    }

    export function updateMediaInfo() {
        processIPC.sendToAll(IPCConstantsToRenderer.scope.redrawMedia,
            new MediaState(media_state.progress, media_state.state, media_state.title, media_state.type));
    }

    function tick() {
        if (Object.keys(tickSummary).length > 0) {
            processIPC.sendToAll(IPCConstantsToRenderer.scope.addValues, new ScopeValues(tickSummary));
            tickSummary = [];
        }
    }

    export function init() {
        setInterval(tick, 50);
    }

    export function sendConfig(source: object) {
        for (const cfg of configs.values()) {
            processIPC.sendToWindow(IPCConstantsToRenderer.scope.configure, source, cfg);
        }
    }
}
