import * as microtime from "../../microtime";
import SerialPort = require("serialport");
import minprot = require('../../../libs/min');
import {Endianness, to_ud3_time, withTimeout} from "../../helper";
import {BootloadableConnection} from "../bootloader/bootloadable_connection";
import {ISidConnection} from "../../sid/ISidConnection";
import {UD3FormattedConnection} from "../../sid/UD3FormattedConnection";
import {IUD3Connection, SynthType} from "./IUD3Connection";
import * as telemetry from "../telemetry";

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
    public readonly port: string;
    public readonly baudrate: number;
    private serialPort: SerialPort;
    private min_wrapper: minprot | undefined;
    private sidConnection: UD3FormattedConnection;

    constructor(port: string, baud: number) {
        super();
        this.port = port;
        this.baudrate = baud;
        this.sidConnection = new UD3FormattedConnection(
            () => this.flushSynth(),
            (data) => this.sendMedia(data)
        );
    }

    public async connect(): Promise<void> {
        return new Promise<void>((res, rej) => {
            this.serialPort = new SerialPort(this.port,
                {
                    baudRate: this.baudrate,
                }, (e: Error | null) => {
                    if (e) {
                        console.log("Not connecting, ", e);
                        rej(e);
                    } else {
                        this.serialPort.on('data', (data: Buffer) => {
                            if (this.isBootloading()) {
                                this.bootloaderCallback(data);
                            } else {
                                this.min_wrapper.min_poll(to_ud3_time(microtime.now(), Endianness.BIG_ENDIAN), data);
                            }
                        });
                        res();
                    }
                });
        })
            .then(() => this.init_min_wrapper())
            .catch((e) => {
                if (this.serialPort && this.serialPort.isOpen) {
                    this.serialPort.close();
                    this.serialPort.destroy();
                }
                throw e;
            });
    }

    public async disconnect() {
        try {
            await withTimeout(this.send_min_socket(false), 500);
        } catch (e) {
            console.error("Failed to disconnect cleanly", e);
        }
        if (this.serialPort && this.serialPort.isOpen) {
            this.serialPort.close();
            this.serialPort.destroy();
            this.min_wrapper = undefined;
            this.serialPort = undefined;
        }
    }

    async sendMedia(data: Buffer) {
        if (this.min_wrapper) {
            await this.min_wrapper.min_queue_frame(MIN_ID_MEDIA, data);
        }
    }

    sendMidi = this.sendMedia;

    getSidConnection(): ISidConnection {
        return this.sidConnection;
    }

    public async sendTelnet(data: Buffer) {
        if (this.min_wrapper) {
            await this.min_wrapper.min_queue_frame(MIN_ID_TERM, data);
        }
    }

    public sendBootloaderData(data: Buffer): Promise<void> {
        return new Promise<void>((res, rej) => {
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
        this.serialPort.flush();
    }

    public leaveBootloaderMode(): void {
        super.leaveBootloaderMode();
        this.init_min_wrapper();
    }

    public resetWatchdog(): void {
        if (this.min_wrapper) {
            this.min_wrapper.min_queue_frame(MIN_ID_WD, []);
        }
    }

    public tick(): void {
        if (this.min_wrapper) {
            this.min_wrapper.min_poll(to_ud3_time(microtime.now(), Endianness.BIG_ENDIAN));
        }
    }

    public async send_min_socket(connect: boolean) {
        if (this.min_wrapper) {
            const infoBuffer = Buffer.from(
                String.fromCharCode(MIN_ID_TERM) +
                String.fromCharCode(connect ? 1 : 0) +
                "TT socket" +
                String.fromCharCode(0),
                'utf-8');
            await this.min_wrapper.min_queue_frame(MIN_ID_SOCKET, infoBuffer);
        }
    }

    public async init_min_wrapper(): Promise<void> {
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
                if (data[0] === 0x78) {
                    this.sidConnection.setBusy(true);
                } else if (data[0] === 0x6f) {
                    this.sidConnection.setBusy(false);
                } else {
                    console.error("Unexpected MEDIA MIN message");
                }
            } else {
                console.warn("Unexpected ID in min: " + id);
            }
        };
        await this.send_min_socket(true);
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

export function createMinSerialConnection(port: string, baudrate: number): IUD3Connection {
    return new MinSerialConnection(port, baudrate);
}

