import {FRAME_LENGTH, ISidSource, SidFrame} from "./sid_api";

export class DumpSidSource implements ISidSource {
    private sid_file: Uint8Array;
    private processedFrames: number = 0;

    constructor(data: Uint8Array) {
        this.sid_file = data;
    }

    public next_frame(): SidFrame {
        const ret = this.sid_file.slice(FRAME_LENGTH * this.processedFrames, FRAME_LENGTH * (this.processedFrames + 1));
        this.processedFrames++;
        return ret;
    }

    public getTotalFrameCount(): number | null {
        return this.sid_file.byteLength / FRAME_LENGTH;
    }

    public getCurrentFrameCount(): number {
        return this.processedFrames;
    }

    public isDone(): boolean {
        return this.processedFrames * FRAME_LENGTH >= this.sid_file.byteLength;
    }
}
