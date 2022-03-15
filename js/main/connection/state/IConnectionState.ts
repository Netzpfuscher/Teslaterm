import {TerminalHandle, UD3Connection} from "../types/UD3Connection";

export interface IConnectionState {
    getButtonText(): string;

    pressButton(window: object): Promise<IConnectionState>;

    getActiveConnection(): UD3Connection | undefined;

    getAutoTerminal(): TerminalHandle | undefined;

    tickFast(): IConnectionState;

    tickSlow(): void;
}

