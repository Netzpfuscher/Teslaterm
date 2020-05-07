import * as net from "net";
import {connectTCPSocket} from "../connection/tcp_helper";
import {jspack} from "jspack";
import {ISidConnection} from "./ISidConnection";

enum Command {
    FLUSH = 0,
    TRY_SET_SID_COUNT = 1,
    MUTE = 2,
    TRY_RESET = 3,
    TRY_DELAY = 4,
    TRY_WRITE = 5,
    TRY_READ = 6,
    GET_VERSION = 7,
    TRY_SET_SAMPLING = 8,
    SET_CLOCKING = 9,
    GET_CONFIG_COUNT = 10,
    GET_CONFIG_INFO = 11,
    SET_SID_POSITION = 12,
    SET_SID_LEVEL = 13,
    SET_SID_MODEL = 14,
    SET_DELAY = 15,
    SET_FADE_IN = 16,
    SET_FADE_OUT = 17,
    SET_SID_HEADER = 18
}

enum ReplyCode {
    OK = 0,
    BUSY = 1,
    ERR = 2,
    READ = 3,
    VERSION = 4,
    COUNT = 5,
    INFO = 6
}

export class NetworkSIDClient implements ISidConnection {
    private socket: net.Socket;
    private replyPromiseQueue: (({code: ReplyCode, data: Buffer}) => void)[] = [];
    private busy: boolean = false;

    public static async create(remoteIP: string, port: number): Promise<NetworkSIDClient> {
        const ret = new NetworkSIDClient();
        ret.socket = await connectTCPSocket(remoteIP, port, "NetSID client", (data) => ret.onDataReceived(data));
        return ret;
    }

    onStart(): void {
        // NOP
    }

    async processFrame(frame: Uint8Array | Buffer, delay: number): Promise<void> {
        console.assert(frame.length === 25);
        let data: number[] = [];
        for (let i = 0; i < frame.length; ++i) {
            // Technically not correct, but C64 clock speed is close enough to 1 MHz for this to work
            const delayForRegister = (i == 0) ? delay : 0;
            const registerData = jspack.Pack("!HBB", [delayForRegister, i, frame[i]]);
            data = data.concat(registerData);
        }
        const reply = await this.sendCommand(Command.TRY_WRITE, 0, data);
        if (reply.code === ReplyCode.BUSY) {
            this.busy = true;
        } else if (reply.code === ReplyCode.OK) {
            this.busy = false;
        } else {
            console.error("Unexpected reply to write: ", reply);
        }
    }

    public async flush() {
        let reply: { code: ReplyCode } = {code: ReplyCode.BUSY};
        while (reply.code === ReplyCode.BUSY) {
            reply = await this.sendCommand(Command.FLUSH, 0, []);
        }
        if (reply.code !== ReplyCode.OK) {
            console.error("Unexpected reply to flush: ", reply);
        }
    }

    isBusy(): boolean {
        return this.busy;
    }

    private onDataReceived(data: Buffer): void {
        const code = data[0];
        if (this.replyPromiseQueue.length > 0) {
            this.replyPromiseQueue[0]({code: code, data: data.slice(1, data.length)});
        } else {
            console.error("Received reply without command: ", code, data);
        }
    }

    private sendCommand(command: Command, sid_number: number, data: number[]): Promise<{ code: ReplyCode, data: Buffer }> {
        return new Promise<{ code: ReplyCode, data: Buffer }>((res, rej) => {
            const packed = jspack.Pack("!BBH", [command, sid_number, data.length]).concat(data);
            this.socket.write(new Buffer(packed));
            this.replyPromiseQueue = this.replyPromiseQueue.concat(res);
        });
    }
}