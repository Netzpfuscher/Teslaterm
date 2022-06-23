import {createServer, Server, Socket} from "net";
import {now} from "../microtime";
import {MessageType, timeout_us, toBytes} from "./CommandMessages";

interface IConnectedClient {
    lastMessageMicrotime: number;
    socket: Socket;
}

export class CommandServer {
    private telnetSocket: Server | undefined;
    private clients: IConnectedClient[] = [];

    public constructor(port: number) {
        this.telnetSocket = createServer({}, (socket) => this.onConnect(socket));
        this.telnetSocket.listen(port);
    }

    public tick() {
        const time = now();
        for (let i = 0; i < this.clients.length;) {
            const client = this.clients[i];
            if (time - client.lastMessageMicrotime > timeout_us) {
                this.clients.splice(i);
                console.log("Client timed out!");
            } else {
                client.socket.write(toBytes({type: MessageType.time, time}));
                ++i;
            }
        }
    }

    public sendSIDFrame(data: Uint8Array, absoluteTime: number) {
        for (const client of this.clients) {
            client.socket.write(toBytes({type: MessageType.sid_frame, data, absoluteServerTime: absoluteTime}));
        }
    }

    public sendMIDI(data: Buffer) {
        for (const client of this.clients) {
            client.socket.write(toBytes({type: MessageType.midi_message, message: data}));
        }
    }

    public sendTelnet(data: Buffer) {
        for (const client of this.clients) {
            client.socket.write(toBytes({type: MessageType.telnet, message: data}));
        }
    }

    private onConnect(socket: Socket) {
        const client = {lastMessageMicrotime: now(), socket};
        this.clients.push(client);
        console.log("Got new client!");
        socket.on("data", (data) => {
            client.lastMessageMicrotime = now();
        });
    }
}
