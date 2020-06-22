declare class minprot {
    debug: boolean;
    sendByte: (data: number[]) => void;
    handler: (id: number, data: number[]) => void;

    constructor(get_ack_payload: () => number[]);

    min_queue_frame(min_id: number, payload: Buffer | number[]): Promise<void>;

    min_poll(buf?: Buffer): void;
}

export = minprot;
