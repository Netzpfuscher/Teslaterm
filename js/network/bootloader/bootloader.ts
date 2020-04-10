import {CyacdArray} from "./cyacd_array";
import Timeout = NodeJS.Timeout;

const ENTER_BOOTLOADER = 0x38;
const PROGRAM = 0x39;
const DATA = 0x37;
const EXIT = 0x3B;

const PACKET_START = 0x01;
const PACKET_END = 0x17;

export class Bootloader {
    public socket: number;
    public last_commands: Array<{ id: number, callback: () => void }>;
    public chip_id: string;
    public silicon_rev: string;
    public ldr_version: string;
    public ldr_conn: boolean;
    public cyacd_file: string;
    public cyacd_arr: CyacdArray;
    public cyacd_chip_id: string;
    public pc: number;
    public time: Timeout;
    public info_cb: (info: string) => void;
    public progress_cb: (progress: number) => void;
    public write_cb: (data: Uint8Array) => Promise<void>;
    public receive_buffer: number[];
    public byte_pos: number;
    public chunk_size: number;
    public done_callback: undefined | (() => void);
    public failure_callback: undefined | (() => void);

    constructor() {
        this.socket = 0;
        this.last_commands = [];
        this.chip_id = '';
        this.silicon_rev = '';
        this.ldr_version = '';
        this.ldr_conn = false;
        this.cyacd_arr = new CyacdArray();
        this.cyacd_chip_id = '';
        this.pc = 0;
        this.info_cb = null;
        this.progress_cb = null;
        this.receive_buffer = [];
        this.byte_pos = 0;
        this.chunk_size = 128;
    }

    public async on_read(data: Uint8Array) {
        for (const subdata of data) {
            this.receive_buffer.push(subdata);
            if (this.receive_buffer.length > 6 && subdata === PACKET_END) {
                const buf = new Uint8Array(this.receive_buffer);
                if (this.last_commands.length > 0) {
                    const last_command = this.last_commands[0];
                    this.receive_buffer = [];
                    switch (last_command.id) {
                        case ENTER_BOOTLOADER:
                            this.boot_decode_enter(buf);
                            break;
                        case PROGRAM:
                            if (buf[1] !== 0) {
                                console.error('ERROR: Error at Row: ' + this.pc);
                            } else {
                                await this.protmr();
                            }
                            break;
                        case DATA:
                            if (buf[1] !== 0) {
                                console.error('ERROR: Error at Row: ' + this.pc);
                            } else {
                                await this.protmr();
                            }
                            break;
                        default:
                            console.warn("Received data, but last command was ", last_command);
                    }
                    last_command.callback();
                    this.last_commands = this.last_commands.slice(1);
                } else {
                    console.warn("Received unexpected packet!");
                    this.receive_buffer = [];
                }
            }
        }
    }

    public async connect() {
        this.receive_buffer = [];
        await this.boot_cmd(ENTER_BOOTLOADER, []);
    }


    public set_progress_cb(cb_func) {
        this.progress_cb = cb_func;
    }

    public set_write_cb(cb_func) {
        this.write_cb = cb_func;
    }

    public set_info_cb(cb_func) {
        this.info_cb = cb_func;
    }

    public async cyacd(file) {
        return new Promise<void>((res, rej) => {
            this.cyacd_file = file;
            const fs = new FileReader();
            fs.onload = (ev) => {
                this.cyacd_loaded(ev).then();
            };
            fs.readAsText(file);
            this.done_callback = res;
            this.failure_callback = rej;
        });
    }

    public async programm(array, row, data) {
        if (data.length === 0) {
            return;
        }
        const buf = new Uint8Array(data.length + 3);
        let cnt = 3;
        buf[0] = array;
        buf[1] = row;
        buf[2] = row >> 8;
        for (const d of data) {
            buf[cnt] = d;
            cnt++;
        }
        await this.boot_cmd(PROGRAM, buf);
    }

    public send_info(str) {
        if (this.info_cb === null) {
            return;
        }
        this.info_cb(str);
    }

    public async cyacd_loaded(ev) {

        this.cyacd_file = ev.srcElement.result.split('\n');
        this.cyacd_chip_id = this.cyacd_file[0].substr(0, 8);
        let cnt = 0;
        this.send_info('INFO: Cyacd loaded, found chip-ID: ' + this.cyacd_chip_id);

        if (this.cyacd_chip_id === this.chip_id) {
            this.send_info('INFO: Chip-ID matches, start programming of flash');
        } else {
            this.send_info('INFO: Chip-ID match failed... exit');
            return;
        }


        for (const line of this.cyacd_file) {
            if (line.startsWith(":")) {
                this.cyacd_arr.array_id[cnt] = parseInt(line.substr(1, 2), 16);
                this.cyacd_arr.row[cnt] = parseInt(line.substr(3, 4), 16);
                this.cyacd_arr.size[cnt] = parseInt(line.substr(7, 4), 16);
                this.cyacd_arr.data[cnt] = line.substring(11, line.length - 3);
                const crchex = line.substring(
                    line.length - 3,
                    line.length - 1,
                );
                this.cyacd_arr.crc[cnt] = parseInt(crchex, 16);
                const byte_arr = new Uint8Array(this.cyacd_arr.size[cnt]);
                let cnt_byte = 0;
                for (let w = 0; w < this.cyacd_arr.data[cnt].length; w += 2) {
                    byte_arr[cnt_byte] = parseInt(this.cyacd_arr.data[cnt].substr(w, 2), 16);
                    cnt_byte++;
                }
                this.cyacd_arr.byte[cnt] = byte_arr;
                cnt++;
            }
        }
        this.pc = 0;
        await this.protmr();
    }

    public async protmr() {
        // TODO
        // if(this.last_command!=0x00 && this.pc !== 0){
        //    this.pc=0;
        //    this.send_info('\r\nERROR: Bootloader not responding');
        //    await this.boot_cmd(EXIT,[]);
        //    return;
        // }

        if (this.pc === this.cyacd_arr.array_id.length) {
            this.last_commands = [];
            this.pc = 0;
            this.send_info('\r\nINFO: Programming done');
            this.done_callback();
            await this.boot_cmd(EXIT, [], true);
            return;
        }
        const temp = this.cyacd_arr.byte[this.pc];
        const percent_done = Math.floor((100.0 / (this.cyacd_arr.array_id.length - 1)) * this.pc);
        const remaining = temp.length - this.byte_pos;
        if (remaining > this.chunk_size) {
            const data = new Uint8Array(this.chunk_size);
            for (let i = 0; i < this.chunk_size; i++) {
                data[i] = temp[this.byte_pos];
                this.byte_pos++;
            }
            await this.boot_cmd(DATA, data);
        } else {
            const data = new Uint8Array(remaining);
            for (let i = 0; i < remaining; i++) {
                data[i] = temp[this.byte_pos];
                this.byte_pos++;
            }

            const old_pc = this.pc;
            this.byte_pos = 0;
            this.pc++;
            this.progress_cb(percent_done);
            await this.programm(this.cyacd_arr.array_id[old_pc], this.cyacd_arr.row[old_pc], data);
        }
    }


    public async boot_cmd(command, data, no_reply?: boolean) {
        const buffer = new Uint8Array(data.length + 7);
        let sum = 0;
        buffer[0] = PACKET_START;
        buffer[1] = command;
        buffer[2] = data.length & 0xFF;
        buffer[3] = (data.length >>> 8) & 0xFF;
        let dat_cnt = 4;
        for (const d of data) {
            buffer[dat_cnt] = d;
            dat_cnt++;
        }
        let size = buffer.length - 3;
        while (size > 0) {
            sum += buffer[size - 1];
            size--;
        }

        const crc = (1 + (~sum)) & 0xFFFF;
        buffer[dat_cnt] = crc & 0xFF;
        dat_cnt++;
        buffer[dat_cnt] = (crc >>> 8) & 0xFF;
        dat_cnt++;
        buffer[dat_cnt] = PACKET_END;
        return new Promise<void>((res, rej) => {
            if (!no_reply) {
                this.last_commands.push({
                    callback: res,
                    id: command,
                });
            }
            this.write_cb(buffer).then(() => {
                if (no_reply) {
                    res();
                }
            });
        });
    }

    public boot_decode_enter(buffer) {
        if (buffer.length !== 15) {
            console.error("Got boot info ", buffer);
            this.info_cb("Invalid boot info");
            return;
        }
        const chip_id_string = (buffer[4] | (buffer[5] << 8) | (buffer[6] << 16) | (buffer[7] << 24));
        this.chip_id = chip_id_string.toString(16).toUpperCase();
        this.silicon_rev = buffer[8].toString(16).toUpperCase();
        this.ldr_version = buffer[10].toString(10) + '.' + buffer[9].toString(10);

        this.send_info('\r\nINFO: Connected to bootloader chip-id: ' + this.chip_id +
            ' silicon-rev: ' + this.silicon_rev +
            ' bootloader version: ' + this.ldr_version);
    }
}
