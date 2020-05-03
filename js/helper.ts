import * as fs from "fs";

export enum Endianness {
    LITTLE_ENDIAN,
    BIG_ENDIAN,
}

export function bytes_to_signed(lsb: number, msb: number): number {
    const sign = msb & (1 << 7);
    const x = (((msb & 0xFF) << 8) | (lsb & 0xFF));
    if (sign) {
        return (0xFFFF0000 | x);  // fill in most significant bits with 1's
    } else {
        return x;
    }
}

export function to_ud3_time_number(time_us: number): number {
    const activeBits = 0xFF_FF_FF_FF;
    const us_per_tick = 3.125;
    const time_ticks = Math.floor(time_us / us_per_tick);
    return (0x1_00_00_00_00 - (time_ticks & activeBits)) & activeBits;
}

export function to_ud3_time(time_us: number, end: Endianness): number[] {
    return to_32_bit_bytes(to_ud3_time_number(time_us), end);
}

export function to_32_bit_bytes(num: number, end: Endianness): number[] {
    const bigEndian = [
        (num >> 24) & 0xff,
        (num >> 16) & 0xff,
        (num >> 8) & 0xff,
        (num >> 0) & 0xff,
    ];
    if (end === Endianness.LITTLE_ENDIAN) {
        return bigEndian.reverse();
    } else {
        return bigEndian;
    }
}

export function from_32_bit_bytes(bytes: number[], end: Endianness): number {
    if (end === Endianness.BIG_ENDIAN) {
        bytes = bytes.reverse();
    }
    return bytes[3] << 24 | bytes[2] << 16 | bytes[1] << 8 | bytes[0];
}

export function convertArrayBufferToString(buf: number[] | Buffer | Uint8Array, uri: boolean = true): string {
    let firstNull = 0;
    while (firstNull < buf.length && buf[firstNull] !== 0) {
        ++firstNull;
    }
    const bufView = new Uint8Array(buf).slice(0, firstNull);
    const encodedString = String.fromCharCode.apply(null, bufView);
    if (uri) {
        return decodeURIComponent(encodedString);
    } else {
        return encodedString;
    }
}

export function convertStringToArrayBuffer(str: string): ArrayBuffer {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0; i < str.length; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

export function changeMenuEntry(menu: string, id: string, newName: string): void {
    const items = (w2ui.toolbar.get(menu, false) as W2UI.W2Menu).items;
    for (const item of items) {
        if (item.id === id) {
            item.text = newName;
            w2ui.toolbar.set(menu, items);
            return;
        }
    }
    console.log("Didn't find name to replace!");
}

export function parseFilter(str: string): number[][] {
    if (str === "") {
        return [];
    }
    if (!/^(\d+(-\d+)?)(,\d+(-\d+)?)*$/.test(str)) {
        return null;
    }
    const ret = [];
    const sections = str.split(",");
    for (const section of sections) {
        const bounds = section.split("-");
        if (bounds.length < 2) {
            const bound = parseInt(bounds[0], 10);
            ret.push([bound, bound]);
        } else {
            const lower = parseInt(bounds[0], 10);
            const upper = parseInt(bounds[1], 10);
            if (lower > upper) {
                return null;
            }
            ret.push([lower, upper]);
        }
    }
    return ret;
}

export function matchesFilter(filters: number[][], num: number): boolean {
    for (const filter of filters) {
        if (filter[0] <= num && num <= filter[1]) {
            return true;
        }
    }
    return false;
}

export function addFirstMenuEntry(menu: string, id: string, text: string, icon: string): void {
    const mnu = w2ui.toolbar.get(menu, false) as W2UI.W2Menu;
    mnu.items = [{text, icon, id}].concat(mnu.items);
}

export function removeMenuEntry(menu: string, id: string): void {
    const mnu = w2ui.toolbar.get(menu, false) as W2UI.W2Menu;
    const items = mnu.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].id === id) {
            mnu.items.splice(i, 1);
            return;
        }
    }
    console.log("Didn't find name to remove!");
}

export function warn(message: string, onConfirmed: () => void) {
    w2confirm(message)
        .no(() => {
        })
        .yes(onConfirmed);
}

export async function readFileAsync(file: fs.PathLike): Promise<Uint8Array> {
    return new Promise<Uint8Array>((res, rej) => {
        fs.readFile(file, (err, data) => {
            if (err) {
                rej(err);
            } else {
                res(data);
            }
        });
    });
}

export async function withTimeout<T>(base: Promise<T>, timeout: number): Promise<T> {
    return new Promise<T>((res, rej) => {
        setTimeout(rej, timeout);
        base.then(res);
    });
}

export async function sleep(delay: number): Promise<void> {
    return new Promise<void>((res, rej) => {
        setTimeout(res, delay);
    });
}
