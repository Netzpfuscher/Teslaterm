import * as net from "net";
import * as dgram from "dgram";
import {terminal} from "../gui/constants";
import {IUD3Connection, SynthType} from "./IUD3Connection";
import * as telemetry from "../network/telemetry";

class EthernetConnection implements IUD3Connection {
    private telnetSocket: net.Socket | undefined;
    private mediaSocket: dgram.Socket | undefined;
    private commandSocket: dgram.Socket | undefined;
    private readonly remoteIp: string;
    private readonly telnetPort: number;
    private readonly mediaPort: number;
    private readonly commandPort: number;

    constructor(ipaddr: string, telnet: number, media: number, command: number) {
        this.remoteIp = ipaddr;
        this.telnetPort = telnet;
        this.mediaPort = media;
        this.commandPort = command;
    }

    public async sendTelnet(data: Buffer) {
        return new Promise<void>((res, rej) => {
            this.telnetSocket.write(data, res);
        });
    }

    public sendMedia(data: Buffer) {
        this.mediaSocket.send(data, this.mediaPort, this.remoteIp);
    }

    public async connect(): Promise<void> {
        this.telnetSocket = await connectTCPSocket(this.remoteIp, this.telnetPort, "main", telemetry.receive_main);
        this.mediaSocket = await createUDPSocket("media", d => {
            console.log("Received Media data: ", d);
            telemetry.receive_media(d);
        });
        this.commandSocket = await createUDPSocket("command", d => {
            //NOP
        });
    }

    public disconnect(): void {
        this.telnetSocket.destroy();
        this.mediaSocket.close();
        this.commandSocket.close();
    }

    public resetWatchdog(): void {
        this.sendTelnet(new Buffer([7]));
    }

    public tick(): void {
    }

    public async flushSynth(): Promise<void> {
        this.sendCommand("flush midi");
    }

    public async setSynth(type: SynthType): Promise<void> {
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

    private sendCommand(cmd: string) {
        this.commandSocket.send(cmd, this.commandPort, this.remoteIp);
    }
}

export function createEthernetConnection(ip: string, telnetPort: number, mediaPort: number, commandPort: number): IUD3Connection {
    return new EthernetConnection(ip, telnetPort, mediaPort, commandPort);
}


function createUDPSocket(
    desc: string,
    dataCallback: (data: Buffer) => void,
): Promise<dgram.Socket> {
    return new Promise<dgram.Socket>((res, rej) => {
        const ret = dgram.createSocket("udp4");
        ret.on('end', () => {
            terminal.io.println("Socket " + desc + " disconnected");
        });
        ret.on('listening', () => res(ret));
        ret.on('error', rej);
        ret.on('data', dataCallback);
        ret.bind();
    });
}


function connectTCPSocket(
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

