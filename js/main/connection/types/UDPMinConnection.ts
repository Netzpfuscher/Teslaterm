import {MinConnection} from "./MinConnection";
import {UD3Connection} from "./UD3Connection";
import * as dgram from 'dgram';

class MinSerialConnection extends MinConnection {
    public readonly remotePort: number;
    public readonly remoteAddress: string;
    private socket: dgram.Socket;

    constructor(remotePort: number, remoteAddress: string) {
        super();
        this.remotePort = remotePort;
        this.remoteAddress = remoteAddress;
    }

    public async connect(): Promise<void> {
        return new Promise<void>((res, rej) => {
            this.socket = dgram.createSocket("udp4");
            this.socket.on('end', () => {
            });
            this.socket.on('error', rej);
            this.socket.connect(this.remotePort, this.remoteAddress, () => res());
        })
            .then(() => super.connect())
            .catch((e) => {
                if (this.socket) {
                    this.socket.close();
                }
                throw e;
            });
    }

    public async disconnect() {
        await super.disconnect();
        if (this.socket) {
            this.socket.close();
            this.socket = undefined;
        }
    }

    registerListener(listener: (data: Buffer) => void): void {
        this.socket.addListener("message", listener);
    }

    send(data: Buffer | number[], onError: (err) => void): void {
        this.socket.send(Buffer.from(data), e => {
            if (e) {
                onError(e);
            }
        });
    }
}

export function createMinUDPConnection(port: number, address: string): UD3Connection {
    return new MinSerialConnection(port, address);
}
