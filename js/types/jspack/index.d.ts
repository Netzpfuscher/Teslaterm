export interface JSPack {
    Pack(format: string, data: any[]): Array<number>;

    Unpack(format: string, data: Buffer | Array<number> | number[]): any[];
}

declare const jspack: JSPack;
