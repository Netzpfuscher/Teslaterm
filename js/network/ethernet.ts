import {UD3Connection} from "./connection";
import * as net from "net";
import * as telemetry from "./telemetry";
import {terminal} from "../gui/gui";

class EthernetConnection implements UD3Connection {
    mainSocket: net.Socket | undefined;
    mediaSocket: net.Socket | undefined;
    ipaddr: string;

    constructor(ipaddr: string) {
        this.ipaddr = ipaddr;
    }

    sendTelnet(data: Buffer) {
        this.mainSocket.write(data);
    }

    sendMedia(data: Buffer) {
        this.mediaSocket.write(data);
    }

    async connect(): Promise<void> {
        await this.createMain();
        await this.createMedia();
    }

    disconnect(): void {
        this.mainSocket.destroy();
        this.mediaSocket.destroy();
    }

    private async createMain(): Promise<void> {
        this.mainSocket = await connectSocket(this.ipaddr, 2323, "main", telemetry.receive_main);
    }

    private async createMedia(): Promise<void> {
        this.mediaSocket = await connectSocket(this.ipaddr, 2323, "media", telemetry.receive_media);
    }

    resetWatchdog(): void {
        this.sendTelnet(new Buffer([7]));
    }

    tick(): void {
        //NOP
    }
}

export function createEthernetConnection(ip: string): UD3Connection {
    return new EthernetConnection(ip);
}


function connectSocket(ipaddr: string, port: number, desc: string, dataCallback: (data: Buffer) => void): Promise<net.Socket> {
    return new Promise<net.Socket>((res, rej) => {
        let connected: boolean = false;
        const ret = net.createConnection({port: port, host: ipaddr}, () => {
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

