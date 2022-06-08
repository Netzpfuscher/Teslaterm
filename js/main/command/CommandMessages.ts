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

function readTime(data: Buffer, offset: number): number {
    return jspack.Unpack('d', data.slice(offset))[0];
}

function writeTime(time: number): number[] {
    return jspack.Pack('d', [time]);
}

export function toBytes(message: Message): Uint8Array {
    const buffer: number[] = [message.type];
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
    return new Uint8Array(buffer);
}

export function fromBytes(data: Buffer): Message {
    const type: MessageType = data[0];
    switch (type) {
        case MessageType.time:
            return {type, time: readTime(data, 1)};
        case MessageType.keep_alive:
            return {type};
        case MessageType.sid_frame:
            return {type, absoluteServerTime: readTime(data, 1), data: data.slice(9)};
        case MessageType.midi_message:
            return {type, message: data.slice(1)};
    }
}
