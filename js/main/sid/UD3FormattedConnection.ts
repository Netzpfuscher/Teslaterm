import {getUD3Connection} from "../connection/connection";
import {commandServer} from "../init";
import * as microtime from "../microtime";
import {ISidConnection} from "./ISidConnection";
import {FRAME_LENGTH, FRAME_UDTIME_LENGTH, SidFrame} from "./sid_api";

export enum FormatVersion {
    v1,
    v2,
}

export class UD3FormattedConnection implements ISidConnection {
    public sendToUD: (data: Buffer) => Promise<void>;
    private readonly flushCallback: () => Promise<void>;
    private lastFrameTime: number | undefined;
    private busy: boolean = false;
    private ffPrefixBytes: number = 4;
    private needsZeroSuffix: boolean = true;

    constructor(flushCallback: () => Promise<void>, sendToUD: (data: Buffer) => Promise<void>) {
        this.flushCallback = flushCallback;
        this.sendToUD = sendToUD;
    }

    public flush(): Promise<void> {
        return this.flushCallback();
    }

    public onStart(): void {
        this.busy = false;
        this.lastFrameTime = microtime.now() + 50e3;
    }

    public switch_format(version: FormatVersion) {
        switch (version) {
            case FormatVersion.v1:
                this.ffPrefixBytes = 4;
                this.needsZeroSuffix = true;
                break;
            case FormatVersion.v2:
                this.ffPrefixBytes = 0;
                this.needsZeroSuffix = false;
                break;
        }
    }

    public async sendVMSFrames(data: Buffer) {
    }

    public processFrame(frame: SidFrame): Promise<void> {
        console.assert(this.lastFrameTime);
        const absoluteTime = this.lastFrameTime;
        this.lastFrameTime += frame.delayMicrosecond;
        return this.processAbsoluteFrame(frame.data, absoluteTime);
    }

    public processAbsoluteFrame(frameData: Uint8Array, absoluteTime: number): Promise<void> {
        const ud_time = getUD3Connection().toUD3Time(absoluteTime);
        const frameSize = this.ffPrefixBytes + FRAME_LENGTH + FRAME_UDTIME_LENGTH + ( this.needsZeroSuffix ? 1 : 0);
        const data = Buffer.alloc(frameSize);
        let byteCount = 0;

        for (let j = 0; j < this.ffPrefixBytes; ++j) {
            data[byteCount++] = 0xFF;
        }
        for (let j = 0; j < FRAME_LENGTH; ++j) {
            data[byteCount++] = frameData[j];
        }

        for (let j = 0; j < FRAME_UDTIME_LENGTH; ++j) {
            data[byteCount++] = ud_time[j];
        }
        if (this.needsZeroSuffix) {
            data[byteCount] = 0;
        }
        if (commandServer) {
            commandServer.sendSIDFrame(frameData, absoluteTime);
        }
        return this.sendToUD(data);
    }

    public setBusy(busy: boolean): void {
        this.busy = busy;
    }

    public isBusy(): boolean {
        return this.busy;
    }
}
