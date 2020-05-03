import {ISidConnection} from "../../sid/ISidConnection";

export enum SynthType {
    NONE = 0x04,
    MIDI = 0x03,
    SID = 0x02,
}

export function toCommandID(type: SynthType): number {
    switch (type) {
        case SynthType.NONE:
            return 0;
        case SynthType.MIDI:
            return 1;
        case SynthType.SID:
            return 2;
    }
    throw new Error("Unknown synth type: "+type);
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
