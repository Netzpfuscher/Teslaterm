import {Socket} from "net";
import {TerminalIPC} from "../ipc/terminal";
import {now} from "../microtime";
import {fromBytes, MessageType, timeout_us, toBytes} from "./CommandMessages";

const averagingOldFactor = 31 / 32;
const averagingNewFactor = 1 - averagingOldFactor;

export class CommandClient {
    private socket: Socket;
    private lastPacketMicrotime: number = now();
    private averagedOffset: number = NaN;

    public constructor(remoteName: string, port: number) {
        this.socket = new Socket();
        this.socket.addListener("data", (data) => this.onData(data));
        this.socket.addListener("error", (err) => TerminalIPC.println("Failed to connect to command server: " + err));
        this.socket.connect(port, remoteName);
    }

    public tick(): boolean {
        this.socket.write(toBytes({type: MessageType.keep_alive}));
        return now() - this.lastPacketMicrotime > timeout_us;
    }

    private onData(data: Buffer) {
        const packet = fromBytes(data);
        const currentTime = now();
        this.lastPacketMicrotime = currentTime;
        switch (packet.type) {
            case MessageType.keep_alive:
                break;
            case MessageType.time:
                const offset = currentTime - packet.time;
                if (isNaN(this.averagedOffset)) {
                    this.averagedOffset = offset;
                } else {
                    this.averagedOffset = averagingOldFactor * this.averagedOffset + averagingNewFactor * offset;
                }
                break;
        }
    }
}

