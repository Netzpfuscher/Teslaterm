import {jspack} from "jspack";

export const timeout_us = 5_000_000;

export enum MessageType {
    time,
    keep_alive,
    sid_frame,
    midi_message,
}

export type Message =
    {type: MessageType.time, time: number} |
    {type: MessageType.keep_alive} |
    {type: MessageType.sid_frame, data: Uint8Array, absoluteServerTime: number} |
    {type: MessageType.midi_message, message: Buffer};

function readTime(data: Buffer | number[], offset: number): number {
    return jspack.Unpack('d', data.slice(offset))[0];
}

function writeTime(time: number): number[] {
    return jspack.Pack('d', [time]);
}

export function toBytes(message: Message): Uint8Array {
    let buffer: number[] = [];
    switch (message.type) {
        case MessageType.keep_alive:
            // NOP
            break;
        case MessageType.time:
            buffer.push(...writeTime(message.time));
            break;
        case MessageType.sid_frame:
            buffer.push(...writeTime(message.absoluteServerTime));
            buffer.push(...message.data);
            break;
        case MessageType.midi_message:
            buffer.push(...message.message);
            break;
    }
    buffer = [buffer.length, message.type, ...buffer];
    return new Uint8Array(buffer);
}

export class Parser {

    private static fromBytes(data: number[]): Message {
        const type: MessageType = data[0];
        switch (type) {
            case MessageType.time:
                return {type, time: readTime(data, 1)};
            case MessageType.keep_alive:
                return {type};
            case MessageType.sid_frame:
                return {type, absoluteServerTime: readTime(data, 1), data: new Uint8Array(data.slice(9))};
            case MessageType.midi_message:
                return {type, message: Buffer.of(...data.slice(1))};
        }
    }

    private readonly consumer: (msg: Message) => void;
    private buffer: number[] = [];

    public constructor(consumer: (msg: Message) => void) {
        this.consumer = consumer;
    }

    public onData(data: Buffer) {
        this.buffer.push(...data);
        while (this.processFrame()) { }
    }

    private processFrame(): boolean {
        if (this.buffer.length < 2) { return false; }
        const actualLength = this.buffer[0] + 2;  // +2: type and length
        if (this.buffer.length < actualLength) { return false; }
        const messageBytes = this.buffer.slice(1, actualLength);
        this.buffer = this.buffer.slice(actualLength);
        this.consumer(Parser.fromBytes(messageBytes));
        return true;
    }
}
