import {TerminalHandle, UD3Connection} from "../types/UD3Connection";

export interface IConnectionState {
    getButtonText(): string;

    pressButton(window: object): IConnectionState;

    getActiveConnection(): UD3Connection | undefined;

    getAutoTerminal(): TerminalHandle | undefined;

    tick(): IConnectionState;
}

