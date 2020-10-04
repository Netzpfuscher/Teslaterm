import {getUD3Connection} from "../connection/connection";
import {ISidConnection} from "./ISidConnection";
import {FRAME_LENGTH, SidFrame} from "./sid_api";
import * as microtime from "../microtime";

export class UD3FormattedConnection implements ISidConnection {
    public sendToUD: (data: Buffer) => Promise<void>;
    private readonly flushCallback: () => Promise<void>;
    private lastFrameTime: number | undefined;
    private busy: boolean = false;
    private version: number = 1;

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

    switch_format(version: number) {
        this.version = version;
    }

    processFrame(frame: SidFrame): Promise<void> {
        console.assert(this.lastFrameTime);
        const ud_time = getUD3Connection().toUD3Time(this.lastFrameTime);
        let data;
        switch (this.version) {
            case 1:
                data = Buffer.alloc(FRAME_LENGTH + 4 + 4 + 1);
                for (let j = 0; j < 4; ++j) {
                    data[j] = 0xFF;
                }
                for (let j = 0; j < FRAME_LENGTH; ++j) {
                    data[j + 4] = frame.data[j];
                }
                for (let j = 0; j < 4; ++j) {
                    data[j + FRAME_LENGTH + 4] = ud_time[j];
                }
                data[4 + FRAME_LENGTH + 4] = 0;
                break;
            case 2:
                data = Buffer.alloc(FRAME_LENGTH + 4);
                for (let j = 0; j < FRAME_LENGTH; ++j) {
                    data[j] = frame.data[j];
                }
                for (let j = 0; j < 4; ++j) {
                    data[j + FRAME_LENGTH] = ud_time[j];
                }
                break;
        }
        this.lastFrameTime += frame.delayMicrosecond;
        return this.sendToUD(data);

    }

    public setBusy(busy: boolean): void {
        this.busy = busy;
    }

    isBusy(): boolean {
        return this.busy;
    }
}
