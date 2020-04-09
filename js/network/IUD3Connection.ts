export enum SynthType {
    NONE = 0x04,
    MIDI = 0x03,
    SID = 0x02,
}

export interface IUD3Connection {
    sendTelnet(data: Buffer): Promise<void>;

    sendMedia(data: Buffer);

    connect(): Promise<void>;

    disconnect(): void;

    resetWatchdog(): void;

    tick(): void;

    flushSynth(): Promise<void>;

    setSynth(type: SynthType): Promise<void>;
}
