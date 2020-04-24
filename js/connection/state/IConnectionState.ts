import {IUD3Connection} from "../IUD3Connection";

export interface IConnectionState {
    getButtonText(): string;

    pressButton(): IConnectionState;

    getActiveConnection(): IUD3Connection | undefined;

    tick(): IConnectionState;
}

