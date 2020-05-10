import {
    IPCConstantsToRenderer,
    ScopeLine,
    ScopeText,
    ScopeTraceConfig,
    ScopeValues
} from "../../common/IPCConstantsToRenderer";
import {MediaState} from "../../common/IPCConstantsToRenderer";
import {processIPC} from "../../common/IPCProvider";
import {media_state} from "../media/media_player";

export module ScopeIPC {
    let tickSummary: { [id: number]: number }[] = [];
    let sinceLastDraw: { [id: number]: number } = {};

    export function refresh() {
        processIPC.send(IPCConstantsToRenderer.scope.refresh);
    }

    export function drawChart() {
        tickSummary[tickSummary.length] = sinceLastDraw;
        sinceLastDraw = {};
    }

    export function addValue(traceId: number, value: number) {
        sinceLastDraw[traceId] = value;
    }

    export function startControlledDraw() {
        processIPC.send(IPCConstantsToRenderer.scope.startControlled);
    }

    export function drawLine(x1: number, y1: number, x2: number, y2: number, color: number) {
        processIPC.send(IPCConstantsToRenderer.scope.drawLine, new ScopeLine(x1, y1, x2, y2, color));
    }

    export function drawText(x: number, y: number, color: number, size: number, str: string, center: boolean) {
        processIPC.send(IPCConstantsToRenderer.scope.drawString, new ScopeText(x, y, color, size, str, center));
    }

    export function configure(traceId: number, min: number, max: number, offset: number, unit: string, name: string) {
        processIPC.send(IPCConstantsToRenderer.scope.configure,
            new ScopeTraceConfig(traceId, min, max, offset, unit, name));
    }

    export function updateMediaInfo() {
        processIPC.send(IPCConstantsToRenderer.scope.redrawMedia,
            new MediaState(media_state.progress, media_state.state, media_state.title, media_state.type));
    }

    function tick() {
        if (Object.keys(tickSummary).length > 0) {
            processIPC.send(IPCConstantsToRenderer.scope.addValues, new ScopeValues(tickSummary));
            tickSummary = [];
        }
    }

    export function init() {
        setInterval(tick, 50);
    }
}
