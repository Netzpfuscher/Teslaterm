import * as net from "net";
import {terminal} from "../gui/constants";
import {IUD3Connection} from "./IUD3Connection";
import * as telemetry from "./telemetry";

class EthernetConnection implements IUD3Connection {
    public mainSocket: net.Socket | undefined;
    public mediaSocket: net.Socket | undefined;
    public ipaddr: string;

    constructor(ipaddr: string) {
        this.ipaddr = ipaddr;
    }

    public async sendTelnet(data: Buffer) {
        return new Promise<void>((res, rej) => {
            this.mainSocket.write(data, res);
        });
    }

    public sendMedia(data: Buffer) {
        this.mediaSocket.write(data);
    }

    public async connect(): Promise<void> {
        await this.createMain();
        await this.createMedia();
    }

    public disconnect(): void {
        this.mainSocket.destroy();
        this.mediaSocket.destroy();
    }

    public resetWatchdog(): void {
        this.sendTelnet(new Buffer([7]));
    }

    public tick(): void {
        // NOP
    }

    private async createMain(): Promise<void> {
        this.mainSocket = await connectSocket(this.ipaddr, 2323, "main", telemetry.receive_main);
    }

    private async createMedia(): Promise<void> {
        this.mediaSocket = await connectSocket(this.ipaddr, 2323, "media", telemetry.receive_media);
    }
}

export function createEthernetConnection(ip: string): IUD3Connection {
    return new EthernetConnection(ip);
}


function connectSocket(
    ipaddr: string,
    port: number,
    desc: string,
    dataCallback: (data: Buffer) => void,
): Promise<net.Socket> {
    return new Promise<net.Socket>((res, rej) => {
        let connected: boolean = false;
        const ret = net.createConnection({port, host: ipaddr}, () => {
            terminal.io.println("Connected socket " + desc);
        });
        ret.on('end', () => {
            terminal.io.println("Socket " + desc + " disconnected");
        });
        ret.addListener('error', (e: Error) => {
            terminal.io.println("Error on " + desc + " socket!");
            console.error(e);
            if (!connected) {
                rej();
            }
        });
        ret.on('data', dataCallback);
        ret.on('connect', () => {
            connected = true;
            res(ret);
        });
    });
}

