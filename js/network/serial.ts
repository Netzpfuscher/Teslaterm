import * as microtime from "microtime";
import {Endianness, to_ud3_time} from "../helper";
import {BootloadableConnection} from "./bootloadable_connection";
import {IUD3Connection, SynthType} from "./IUD3Connection";
import * as telemetry from "./telemetry";
import SerialPort = require("serialport");
import minprot = require('../../libs/min');

const MIN_ID_WD = 10;
const MIN_ID_MEDIA = 20;
const MIN_ID_TERM = 0;
const MIN_ID_SOCKET = 13;
const MIN_ID_SYNTH = 14;

const SYNTH_CMD_FLUSH = 0x01;
const SYNTH_CMD_SID = 0x02;
const SYNTH_CMD_MIDI = 0x03;
const SYNTH_CMD_OFF = 0x04;

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
            this.min_wrapper.min_queue_frame(MIN_ID_WD, to_ud3_time(microtime.now(), Endianness.BIG_ENDIAN));
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

    public async flushSynth(): Promise<void> {
        if (this.min_wrapper) {
            await this.min_wrapper.min_queue_frame(MIN_ID_SYNTH, [SYNTH_CMD_FLUSH]);
        }
    }

    public async setSynth(type: SynthType): Promise<void> {
        if (this.min_wrapper) {
            await this.min_wrapper.min_queue_frame(MIN_ID_SYNTH, [type]);
        }
    }
}

export function createSerialConnection(port: string): IUD3Connection {
    return new MinSerialConnection(port);
}

