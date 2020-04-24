import {Endianness, to_ud3_time, to_ud3_time_number} from "../helper";
import {ISidConnection} from "./ISidConnection";
import {FRAME_LENGTH} from "./sid_api";
import * as microtime from "microtime";

export class UD3FormattedConnection implements ISidConnection {
    private readonly flushCallback: () => Promise<void>;
    private readonly sendToUD: (data: Buffer) => Promise<void>;
    private lastFrameTime: number | undefined;
    private busy: boolean = false;

    constructor(flushCallback: () => Promise<void>, sendToUD: (data: Buffer) => Promise<void>) {
        this.flushCallback = flushCallback;
        this.sendToUD = sendToUD;
    }

    flush(): Promise<void> {
        return this.flushCallback();
    }

    onStart(): void {
        this.busy = false;
        this.lastFrameTime = microtime.now() + 50e3;
    }

    processFrame(real_frame: Uint8Array | Buffer, delay: number): Promise<void> {
        console.assert(this.lastFrameTime);
        console.assert(real_frame.length === FRAME_LENGTH);
        const data = new Buffer(FRAME_LENGTH + 4 + 4);
        for (let j = 0; j < 4; ++j) {
            data[j] = 0xFF;
        }
        for (let j = 0; j < FRAME_LENGTH; ++j) {
            data[j + 4] = real_frame[j];
        }
        // Why did you decide to mix big and little endian, Jens???
        const ud_time = to_ud3_time(this.lastFrameTime, Endianness.LITTLE_ENDIAN);
        for (let j = 0; j < 4; ++j) {
            data[j + FRAME_LENGTH + 4] = ud_time[j];
        }
        this.lastFrameTime += delay;
        return this.sendToUD(data);
    }

    public setBusy(busy: boolean): void {
        this.busy = busy;
    }

    isBusy(): boolean {
        return this.busy;
    }
}
