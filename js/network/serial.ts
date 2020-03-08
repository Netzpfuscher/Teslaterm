import {UD3Connection} from "./connection";
import SerialPort = require("serialport");
// @ts-ignore
import minprot = require('../../../libs/min');
import * as telemetry from "./telemetry";

const MIN_ID_WD = 10;
const MIN_ID_MEDIA = 20;
const MIN_ID_TERM = 0;
const MIN_ID_SOCKET = 13;


class MinSerialConnection implements UD3Connection {
    port: string;
    serialPort: SerialPort;
    minWrapper: minprot;

    constructor(port: string) {
        this.port = port;
    }

    async connect(): Promise<void> {
        return new Promise<void>((res, rej) => {
            this.serialPort = new SerialPort(this.port,
                {
                    baudRate: 500000
                }, (e: Error | null) => {
                    if (e) {
                        rej(e);
                    } else {
                        this.minWrapper = new minprot();
                        this.minWrapper.sendByte = (data) => {
                            this.serialPort.write(data, (err) => {
                                if (err) {
                                    console.error("Error while sending serial data: ", err);
                                }
                            });
                        };
                        this.minWrapper.handler = (id, data) => {
                            if (id == MIN_ID_TERM) {
                                telemetry.receive_main(new Buffer(data));
                            } else if (id == MIN_ID_MEDIA) {
                                telemetry.receive_media(new Buffer(data));
                            } else {
                                console.warn("Unexpected ID in min: " + id);
                            }
                        };
                        this.serialPort.on('data', (data) => {
                            this.minWrapper.min_poll(data);
                        });
                        this.send_min_socket(true);
                        res();
                    }
                });

        });
    }

    disconnect(): void {
        this.send_min_socket(false);
        this.serialPort.close();
        this.serialPort.destroy();
    }

    async sendMedia(data: Buffer) {
        await this.minWrapper.min_queue_frame(MIN_ID_MEDIA, data);
    }

    async sendTelnet(data: Buffer) {
        await this.minWrapper.min_queue_frame(MIN_ID_TERM, data);
    }

    resetWatchdog(): void {
        this.minWrapper.min_queue_frame(MIN_ID_WD, [MIN_ID_TERM]);
    }

    tick(): void {
        this.minWrapper.min_poll();
    }

    send_min_socket(connect: boolean) {
        let connect_int: number;
        if (connect == true) {
            connect_int = 1;
        } else {
            connect_int = 0;
        }
        let infoBuffer = Buffer.from(
            String.fromCharCode(MIN_ID_TERM) + String.fromCharCode(connect_int) + "TT socket" + String.fromCharCode(0),
            'utf-8');
        this.minWrapper.min_queue_frame(MIN_ID_SOCKET, infoBuffer);
    }
}

export function createSerialConnection(port: string): UD3Connection {
    return new MinSerialConnection(port);
}

