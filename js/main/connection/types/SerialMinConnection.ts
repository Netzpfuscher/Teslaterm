import {MinConnection} from "./MinConnection";
import {UD3Connection} from "./UD3Connection";
import SerialPort = require("serialport");


class MinSerialConnection extends MinConnection {
    public readonly port: string;
    public readonly baudrate: number;
    private serialPort: SerialPort;

    constructor(port: string, baud: number) {
        super();
        this.port = port;
        this.baudrate = baud;
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
                        this.serialPort.on("error", e => console.log(e));
                        res();
                    }
                });
        })
            .then(() => super.connect())
            .catch((e) => {
                if (this.serialPort && this.serialPort.isOpen) {
                    this.serialPort.close();
                    this.serialPort.destroy();
                }
                throw e;
            });
    }

    public async disconnect() {
        await super.disconnect();
        if (this.serialPort) {
            if (this.serialPort.isOpen) {
                this.serialPort.close();
            }
            this.serialPort.destroy();
            this.serialPort = undefined;
        }
    }

    public enterBootloaderMode(dataCallback: (data: Buffer) => void): void {
        super.enterBootloaderMode(dataCallback);
        this.serialPort.flush();
    }

    registerListener(listener: (data: Buffer) => void): void {
        this.serialPort.addListener("data", listener);
    }

    send(data: Buffer | number[], onError: (err) => void): void {
        this.serialPort.write(data, onError);
    }
}

export function createMinSerialConnection(port: string, baudrate: number): UD3Connection {
    return new MinSerialConnection(port, baudrate);
}

