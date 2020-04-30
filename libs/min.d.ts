declare class minprot {
    debug: boolean;
    sendByte: (data: number[]) => void;
    handler: (id: number, data: number[]) => void;

    constructor();

    min_queue_frame(min_id: number, payload: Buffer | number[]): Promise<void>;

    min_poll(time_to_send: number[], buf?: Buffer): void;
}

export = minprot;
