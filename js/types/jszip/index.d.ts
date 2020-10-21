interface JSZip {
    file(path: string, data: ArrayBuffer): this;
    generateAsync(options: {type: "uint8array"}): Uint8Array;

    new (): this;
}

declare const JSZip: JSZip;
