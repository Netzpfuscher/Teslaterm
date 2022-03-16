import {jspack} from "jspack";

export const timeout_us = 5_000_000;

export enum MessageType {
    time,
    keep_alive,
}

export type Message =
    {type: MessageType.time, time: number} |
    {type: MessageType.keep_alive};

export function toBytes(message: Message): Uint8Array {
    const buffer: number[] = [message.type];
    switch (message.type) {
        case MessageType.keep_alive:
            // NOP
            break;
        case MessageType.time:
            buffer.push(...jspack.Pack('d', [message.time]));
            break;
    }
    return new Uint8Array(buffer);
}

export function fromBytes(data: Buffer): Message {
    const type: MessageType = data[0];
    switch (type) {
        case MessageType.time:
            return {type, time: jspack.Unpack('d', data.slice(1))[0]};
        case MessageType.keep_alive:
            return {type};
    }
}
