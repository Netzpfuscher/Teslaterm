import {FRAME_LENGTH, SidFrame, SidSource} from "./sid";

export class DumpSidSource implements SidSource {
    sid_file: Uint8Array;
    processedFrames: number = 0;
    constructor(data: Uint8Array) {
        this.sid_file = data;
    }

    next_frame(): SidFrame {
        const ret = this.sid_file.slice(FRAME_LENGTH*this.processedFrames, FRAME_LENGTH*(this.processedFrames+1));
        this.processedFrames++;
        return ret;
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
