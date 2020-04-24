import * as net from "net";
import * as dgram from "dgram";
import {terminal} from "../gui/constants";
import {ISidConnection} from "../sid/ISidConnection";
import {NetworkSIDClient} from "../sid/NetworkSIDClient";
import {connectTCPSocket} from "./tcp_helper";
import {IUD3Connection, SynthType} from "./IUD3Connection";
import * as telemetry from "../network/telemetry";

class EthernetConnection implements IUD3Connection {
    private telnetSocket: net.Socket | undefined;
    private sidClient: NetworkSIDClient;
    private midiSocket: dgram.Socket | undefined;
    private readonly remoteIp: string;
    private readonly telnetPort: number;
    private readonly midiPort: number;
    private readonly sidPort: number;

    constructor(ipaddr: string, telnet: number, midi: number, sid: number) {
        this.remoteIp = ipaddr;
        this.telnetPort = telnet;
        this.midiPort = midi;
        this.sidPort = sid;
    }

    public async sendTelnet(data: Buffer) {
        return new Promise<void>((res, rej) => {
            this.telnetSocket.write(data, res);
        });
    }

    async sendMidi(data: Buffer) {
        this.midiSocket.send(data, this.midiPort, this.remoteIp);
    }

    public async connect(): Promise<void> {
        this.telnetSocket = await connectTCPSocket(this.remoteIp, this.telnetPort, "main", telemetry.receive_main);
        this.midiSocket = await createUDPSocket("media", d => {
            console.error("Received unexpected data on MIDI socket: ", d);
        });
        this.sidClient = await NetworkSIDClient.create(this.remoteIp, this.sidPort);
    }

    public disconnect(): void {
        this.telnetSocket.destroy();
        this.midiSocket.close();
    }

    public resetWatchdog(): void {
        this.sendTelnet(new Buffer([7]));
    }

    public tick(): void {
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

    getSidConnection(): ISidConnection {
        return this.sidClient;
    }
}

export function createEthernetConnection(ip: string, telnetPort: number, midiPort: number, sidPort: number): IUD3Connection {
    return new EthernetConnection(ip, telnetPort, midiPort, sidPort);
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

