//The types are not technically correct (only work for numbers), but are more useful than "any"
export interface JSPack {
    Pack(format: string, data: number[]): Array<number>;

    Unpack(format: string, data: Buffer | Array<number> | number[]): number[];
}

declare const jspack: JSPack;
