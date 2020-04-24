import {promisify} from "util";
import {ISidConnection} from "../sid/ISidConnection";
import {IUD3Connection, SynthType} from "./IUD3Connection";
import * as telemetry from "../network/telemetry";
import SerialPort = require("serialport");

export class PlainSerialConnection implements IUD3Connection {
    private serialPort: SerialPort;
    private readonly baudrate: number;
    private readonly port: string;

    constructor(port: string, baudrate: number) {
        this.baudrate = baudrate;
        this.port = port;
    }

    connect(): Promise<void> {
        return new Promise<void>((res, rej) => {
            this.serialPort = new SerialPort(this.port,
                {
                    baudRate: this.baudrate,
                }, (e: Error | null) => {
                    if (e) {
                        console.log("Not connecting, ", e);
                        rej(e);
                    } else {
                        this.serialPort.on('data', telemetry.receive_main);
                        res();
                    }
                });
        })
            .catch((e) => {
                if (this.serialPort && this.serialPort.isOpen) {
                    this.serialPort.close();
                    this.serialPort.destroy();
                }
                throw e;
            });
    }

    disconnect(): void {
        this.sendTelnet(new Buffer("tterm stop"));
        this.serialPort.close();
        this.serialPort.destroy();
    }

    getSidConnection(): ISidConnection {
        //TODO
        return undefined;
    }

    resetWatchdog(): void {
        this.sendTelnet(Buffer.of(7));
    }

    sendMidi(data: Buffer): Promise<void> {
        //TODO
        return Promise.reject();
    }

    async sendTelnet(data: Buffer): Promise<void> {
        //await promisify(this.serialPort.write)(data);
        this.serialPort.write(data);
    }

    setSynth(type: SynthType): Promise<void> {
        // TODO proper conversion method
        let id: number;
        switch (type) {
            case SynthType.NONE:
                id = 0;
                break;
            case SynthType.MIDI:
                id = 1;
                break;
            case SynthType.SID:
                id = 2;
                break;
        }
        return this.sendTelnet(new Buffer("set synth " + id.toString(10) + "\r"));
    }

    tick(): void {
        // NOP
    }
}

export function createPlainSerialConnection(port: string, baudrate: number): IUD3Connection {
    return new PlainSerialConnection(port, baudrate);
}
