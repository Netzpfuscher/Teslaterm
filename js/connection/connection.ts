import {IUD3Connection} from "./IUD3Connection";
import {IConnectionState} from "./state/IConnectionState";
import {Idle} from "./state/Idle";
import {Connecting} from "./state/Connecting";
import * as ConnectionUI from "../gui/ConnectionUI";

export let connectionState: IConnectionState = new Idle();

export function pressButton() {
    connectionState = connectionState.pressButton();
}

export function autoConnect() {
    console.assert(connectionState instanceof Idle);
    const autoconnect_options = ConnectionUI.getDefaultOptions(true);
    if (autoconnect_options) {
        connectionState = new Connecting(Idle.connectWithOptions(autoconnect_options));
    }
}

let lastButton: string;

export function update(): boolean {
    connectionState = connectionState.tick();
    const newButton = connectionState.getButtonText();
    const ret = newButton !== lastButton;
    lastButton = newButton;
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
