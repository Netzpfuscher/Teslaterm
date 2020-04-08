import * as microtime from "microtime";
import SerialPort = require("serialport");
import minprot = require('../../libs/min');
import {to_32_bit_bytes} from "../helper";
import {BootloadableConnection} from "./bootloadable_connection";
import {IUD3Connection} from "./IUD3Connection";
import * as telemetry from "./telemetry";

const MIN_ID_WD = 10;
const MIN_ID_MEDIA = 20;
const MIN_ID_TERM = 0;
const MIN_ID_SOCKET = 13;


class MinSerialConnection extends BootloadableConnection implements IUD3Connection {
    public port: string;
    public serialPort: SerialPort;
    public min_wrapper: minprot | undefined;

    constructor(port: string) {
        super();
        this.port = port;
    }

    public async connect(): Promise<void> {
        return new Promise<void>((res, rej) => {
            this.serialPort = new SerialPort(this.port,
                {
                    // TODO config
                    baudRate: 460_800,
                }, (e: Error | null) => {
                    if (e) {
                        rej(e);
                    } else {
                        this.init_min_wrapper();
                        this.serialPort.on('data', (data) => {
                            if (this.isBootloading()) {
                                console.log("Received data: ", data);
                                console.log("Passing data to bootloader");
                                this.bootloaderCallback(data);
                            } else {
                                this.min_wrapper.min_poll(data);
                            }
                        });
                        res();
                    }
                });
        });
    }

    public disconnect(): void {
        this.send_min_socket(false);
        this.serialPort.close();
        this.serialPort.destroy();
        console.log("Disconnected!");
    }

    public async sendMedia(data: Buffer) {
        if (this.min_wrapper) {
            await this.min_wrapper.min_queue_frame(MIN_ID_MEDIA, data);
        }
    }

    public async sendTelnet(data: Buffer) {
        if (this.min_wrapper) {
            await this.min_wrapper.min_queue_frame(MIN_ID_TERM, data);
        }
    }

    public sendBootloaderData(data: Buffer): Promise<void> {
        console.log("Sending bootloader data: ", data);
        return new Promise<void>((res, rej) => {
            console.log("This: ", this, ", serialport: ", this.serialPort);
            this.serialPort.write(data, (err) => {
                if (err) {
                    rej(err);
                } else {
                    res();
                }
            });
        });
    }

    public enterBootloaderMode(dataCallback: (data: Buffer) => void): void {
        super.enterBootloaderMode(dataCallback);
        this.min_wrapper = undefined;
    }

    public leaveBootloaderMode(): void {
        super.leaveBootloaderMode();
        this.init_min_wrapper();
    }

    public resetWatchdog(): void {
        if (this.min_wrapper) {
            const us_per_tick = 3.125;
            const time_us = microtime.now();
            const time_ticks = Math.floor(time_us / us_per_tick);
            const time_for_ud = 0x100000000 - (time_ticks & 0xFFFFFFFF);
            this.min_wrapper.min_queue_frame(MIN_ID_WD, to_32_bit_bytes(time_for_ud));
        }
    }

    public tick(): void {
        if (this.min_wrapper) {
            this.min_wrapper.min_poll();
        }
    }

    public send_min_socket(connect: boolean) {
        const infoBuffer = Buffer.from(
            String.fromCharCode(MIN_ID_TERM) +
            String.fromCharCode(connect ? 1 : 0) +
            "TT socket" +
            String.fromCharCode(0),
            'utf-8');
        this.min_wrapper.min_queue_frame(MIN_ID_SOCKET, infoBuffer);
    }

    public init_min_wrapper(): void {
        this.min_wrapper = new minprot();
        this.min_wrapper.sendByte = (data) => {
            if (this.isBootloading()) {
                return;
            }
            this.serialPort.write(data, (err) => {
                if (err) {
                    console.error("Error while sending serial data: ", err);
                }
            });
        };
        this.min_wrapper.handler = (id, data) => {
            if (id === MIN_ID_TERM) {
                telemetry.receive_main(new Buffer(data));
            } else if (id === MIN_ID_MEDIA) {
                telemetry.receive_media(new Buffer(data));
            } else {
                console.warn("Unexpected ID in min: " + id);
            }
        };
        this.send_min_socket(true);
    }
}

export function createSerialConnection(port: string): IUD3Connection {
    return new MinSerialConnection(port);
}

