import {IUD3Connection} from "./IUD3Connection";
import {IConnectionState} from "./state/IConnectionState";
import {Idle} from "./state/Idle";

// TODO move to some other file?
export let connectionState: IConnectionState = new Idle();

export function pressButton(port: string) {
    connectionState = connectionState.pressButton(port);
}

let lastButtonText: string;
let lastButtonTooltip: string;

export function update(): boolean {
    connectionState = connectionState.tick();
    const newText = connectionState.getButtonText();
    const newTooltip = connectionState.getButtonTooltip();
    const ret = newText !== lastButtonText || newTooltip !== lastButtonTooltip;
    lastButtonText = newText;
    lastButtonTooltip = newTooltip;
    return ret;
}

export function getUD3Connection(): IUD3Connection {
    const ret = connectionState.getActiveConnection();
    if (!ret) {
        throw new Error("No connection is currently active");
    }
    return ret;
}

export function hasUD3Connection(): boolean {
    return connectionState.getActiveConnection() !== undefined;
}
