import {Socket} from "net";
import {SynthType} from "../../common/CommonTypes";
import {getOptionalUD3Connection} from "../connection/connection";
import {TerminalIPC} from "../ipc/terminal";
import {now} from "../microtime";
import {playMidiData} from "../midi/midi";
import {UD3FormattedConnection} from "../sid/UD3FormattedConnection";
import {fromBytes, MessageType, timeout_us, toBytes} from "./CommandMessages";

const averagingOldFactor = 31 / 32;
const averagingNewFactor = 1 - averagingOldFactor;

interface IAbsoluteSIDFrame {
    data: Uint8Array;
    absTime: number;
}

export class CommandClient {
    private socket: Socket;
    private lastPacketMicrotime: number = now();
    private averagedOffset: number = NaN;
    private sidFrameQueue: IAbsoluteSIDFrame[] = [];

    public constructor(remoteName: string, port: number) {
        this.socket = new Socket();
        this.socket.addListener("data", (data) => this.onData(data));
        this.socket.addListener("error", (err) => TerminalIPC.println("Failed to connect to command server: " + err));
        this.socket.connect(port, remoteName);
    }

    public tickFast() {
        this.handleSIDQueue().catch((err) => console.log("While handling SID queue: ", err));
    }

    public tickSlow(): boolean {
        this.socket.write(toBytes({type: MessageType.keep_alive}));
        return now() - this.lastPacketMicrotime > timeout_us;
    }

    private async handleSIDQueue() {
        if (this.sidFrameQueue.length === 0) {
            return;
        }
        const ud3Connection = getOptionalUD3Connection();
        if (!ud3Connection) {
            return;
        }
        const activeConnection = ud3Connection.getSidConnection();
        if (!(activeConnection instanceof UD3FormattedConnection)) {
            return;
        }
        await ud3Connection.setSynth(SynthType.SID, true);
        let numSent = 0;
        while (!activeConnection.isBusy() && this.sidFrameQueue.length > 0 && numSent < 4) {
            const next = this.sidFrameQueue.shift();
            activeConnection.processAbsoluteFrame(next.data, next.absTime)
                .catch((err) => console.log("While processing SID from command server: ", err));
            ++numSent;
        }
    }

    private async onData(data: Buffer) {
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
            case MessageType.sid_frame:
                this.sidFrameQueue.push({data: packet.data, absTime: packet.absoluteServerTime + this.averagedOffset});
                break;
            case MessageType.midi_message:
                playMidiData(packet.message);
                break;
        }
    }
}
