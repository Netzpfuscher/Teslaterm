export const FRAME_LENGTH = 25;

export type SidFrame = Uint8Array;

export interface ISidSource {
    next_frame(): SidFrame;

    getTotalFrameCount(): number | null;

    getCurrentFrameCount(): number;

    isDone(): boolean;
}
