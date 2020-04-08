export interface IUD3Connection {
    sendTelnet(data: Buffer): Promise<void>;

    sendMedia(data: Buffer);

    connect(): Promise<void>;

    disconnect(): void;

    resetWatchdog(): void;

    tick(): void;
}
