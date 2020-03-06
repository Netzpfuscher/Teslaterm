declare class minprot {
    debug: boolean;
    sendByte: (data: number[]) => void;
    handler: (id: number, data: number[]) => void;

    min_queue_frame(min_id: number, payload: Buffer | number[]): void;

    min_poll(buf?: Buffer): void;
}