import {SerialPort} from "serialport";
import {SynthType} from "../../../common/CommonTypes";
import {ISidConnection} from "../../sid/ISidConnection";
import {toCommandID, UD3Connection} from "./UD3Connection";

export class PlainSerialConnection extends UD3Connection {
    private serialPort: SerialPort;
    private readonly baudrate: number;
    private readonly port: string;

    constructor(port: string, baudrate: number) {
        super();
        this.baudrate = baudrate;
        this.port = port;
    }

    connect(): Promise<void> {
        return new Promise<void>((res, rej) => {
            this.serialPort = new SerialPort(
                {
                    baudRate: this.baudrate,
                    path: this.port,
                }, (e: Error | null) => {
                    if (e) {
                        console.log("Not connecting, ", e);
                        rej(e);
                    } else {
                        this.serialPort.on('data', (data: Buffer) => {
                            for (const terminal of this.terminalCallbacks.values()) {
                                terminal.callback(data);
                            }
                        });
                        res();
                    }
                });
        })
            .catch((e) => {
                this.close();
                throw e;
            });
    }

    private close() {
        if (this.serialPort && this.serialPort.isOpen) {
            this.serialPort.close();
            this.serialPort.destroy();
        }
    }

    public async sendVMSFrames(data: Buffer) {
    }

    disconnect(): void {
        this.sendTelnet(Buffer.from("tterm stop"));
        this.close();
    }

    getSidConnection(): ISidConnection {
        //TODO add support for returning undefined here
        return undefined;
    }

    resetWatchdog(): void {
        this.sendAsync(Buffer.of(0xF0, 0x0F, 0));
        //this.sendAsync(Buffer.of(0x07));
    }

    sendMidi(data: Buffer): Promise<void> {
        if (data.length < 3) {
            data = Buffer.concat([data, Buffer.alloc(3-data.length, 0)]);
        }
        console.assert(data[0] >= 0x80);
        return this.sendAsync(data);
    }

    async sendTelnet(data: Buffer): Promise<void> {
        await this.sendAsync(data);
    }

    setSynthImpl(type: SynthType): Promise<void> {
        const id = toCommandID(type);
        return this.sendTelnet(Buffer.from("set synth " + id.toString(10) + "\r"));
    }

    tick(): void {
        // NOP
    }

    private async sendAsync(rawData: Buffer): Promise<void> {
        return new Promise<void>((res, rej) => {
            this.serialPort.write(rawData, err => {
                if (err) {
                    rej(err);
                } else {
                    res();
                }
            });
        });
    }

    getMaxTerminalID(): number {
        throw new Error();
    }

    isMultiTerminal(): boolean {
        return false;
    }
}

export function createPlainSerialConnection(port: string, baudrate: number): UD3Connection {
    return new PlainSerialConnection(port, baudrate);
}
