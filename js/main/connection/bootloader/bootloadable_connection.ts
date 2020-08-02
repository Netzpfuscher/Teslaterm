import {SynthType} from "../../../common/CommonTypes";
import {ISidConnection} from "../../sid/ISidConnection";
import {UD3Connection, TerminalHandle} from "../types/UD3Connection";

export abstract class BootloadableConnection extends UD3Connection {
    public bootloaderCallback: ((data: Buffer) => void) | undefined;

    public enterBootloaderMode(dataCallback: (data: Buffer) => void): void {
        this.bootloaderCallback = dataCallback;
    }

    public leaveBootloaderMode(): void {
        this.bootloaderCallback = undefined;
    }

    public isBootloading(): boolean {
        return this.bootloaderCallback !== undefined;
    }

    public abstract sendBootloaderData(data: Buffer): Promise<void>;

    abstract connect(): Promise<void>;

    abstract disconnect(): void;

    abstract getSidConnection(): ISidConnection;

    abstract resetWatchdog(): void;

    abstract sendMidi(data: Buffer): Promise<void>;

    abstract sendTelnet(data: Buffer, handle: TerminalHandle): Promise<void>;

    abstract setSynthImpl(type: SynthType): Promise<void>;

    abstract tick(): void;

    abstract getMaxTerminalID(): number;
}
