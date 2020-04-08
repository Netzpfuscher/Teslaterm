export class CyacdArray {
    public data: string[];
    public array_id: number[];
    public row: number[];
    public size: number[];
    public byte: Uint8Array[];
    public crc: number[];

    constructor() {
        this.data = [];
        this.array_id = [];
        this.row = [];
        this.size = [];
        this.byte = [];
        this.crc = [];
    }
}
