import {ISidConnection} from "../sid/ISidConnection";

export enum SynthType {
    NONE = 0x04,
    MIDI = 0x03,
    SID = 0x02,
}

export interface IUD3Connection {
    sendTelnet(data: Buffer): Promise<void>;

    sendMidi(data: Buffer): Promise<void>;

    getSidConnection(): ISidConnection;

    connect(): Promise<void>;

    disconnect(): void;

    resetWatchdog(): void;

    tick(): void;

    setSynth(type: SynthType): Promise<void>;
}
