import {
    IPCConstantsToRenderer,
    ScopeLine,
    ScopeText,
    ScopeTraceConfig,
    ScopeValue
} from "../../common/IPCConstantsToRenderer";
import {MediaState} from "../../common/IPCConstantsToRenderer";
import {mainWindow} from "../main";
import {media_state} from "../media/media_player";

export class Scope {
    public static refresh() {
        mainWindow.webContents.send(IPCConstantsToRenderer.scope.refresh);
    }

    public static drawChart() {
        mainWindow.webContents.send(IPCConstantsToRenderer.scope.drawChart);
    }

    public static addValue(traceId: number, value: number) {
        mainWindow.webContents.send(IPCConstantsToRenderer.scope.addValue, new ScopeValue(traceId, value));
    }

    public static startControlledDraw() {
        mainWindow.webContents.send(IPCConstantsToRenderer.scope.startControlled);
    }

    public static drawLine(x1: number, y1: number, x2: number, y2: number, color: number) {
        mainWindow.webContents.send(IPCConstantsToRenderer.scope.drawLine, new ScopeLine(x1, y1, x2, y2, color));
    }

    public static drawText(x: number, y: number, color: number, size: number, str: string, center: boolean) {
        mainWindow.webContents.send(IPCConstantsToRenderer.scope.drawString, new ScopeText(x, y, color, size, str, center));
    }

    public static configure(traceId: number, min: number, max: number, offset: number, unit: string, name: string) {
        mainWindow.webContents.send(IPCConstantsToRenderer.scope.configure,
            new ScopeTraceConfig(traceId, min, max, offset, unit, name));
    }

    public static updateMediaInfo() {
        mainWindow.webContents.send(IPCConstantsToRenderer.scope.redrawMedia,
            new MediaState(media_state.progress, media_state.state, media_state.title, media_state.type));
    }
}
