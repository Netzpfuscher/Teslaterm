import {FRAME_LENGTH, SidFrame, SidSource} from "./sid";

export class DumpSidSource implements SidSource {
    sid_file: Uint8Array;
    processedFrames: number = 0;
    constructor(data: ArrayBuffer) {
        this.sid_file = new Uint8Array(data);
    }

    next_frame(): SidFrame {
        const ret = this.sid_file.slice(FRAME_LENGTH*this.processedFrames, FRAME_LENGTH*(this.processedFrames+1));
        this.processedFrames++;
        return new SidFrame(ret);
    }

    getTotalFrameCount(): number | null {
        return this.sid_file.byteLength/FRAME_LENGTH;
    }

    getCurrentFrameCount(): number {
        return this.processedFrames;
    }

    isDone(): boolean {
        return this.processedFrames*FRAME_LENGTH>=this.sid_file.byteLength;
    }
}
