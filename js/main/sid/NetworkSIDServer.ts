import * as net from "net";
import {SynthType} from "../../common/CommonTypes";
import {getOptionalUD3Connection} from "../connection/connection";
import {getActiveSIDConnection} from "./ISidConnection";
import {Command, ReplyCode} from "./NetSIDConstants";
import {jspack} from "jspack";
import {FRAME_LENGTH, SidFrame} from "./sid_api";

export class NetworkSIDServer {
    private serverSocket: net.Server;
    private readonly port: number;
    private extraDelayNextFrame: number = 0;
    private currentSIDState: Uint8Array = new Uint8Array(FRAME_LENGTH);
    private localBuffer: SidFrame[] = [];

    public constructor(port: number) {
        this.port = port;
        this.startListening();
    }

    private startListening() {
        if (!this.serverSocket) {
            this.serverSocket = net.createServer(conn => this.onConnected(conn));
            this.serverSocket.listen(this.port);
        }
    }

    private stopListening() {
        if (this.serverSocket) {
            this.serverSocket.close();
            this.serverSocket = null;
        }
    }

    private onConnected(socket: net.Socket) {
        this.stopListening();
        socket.once("close", () => this.startListening());
        socket.on("data", async (data) => {
            const reply = await this.handleMessage(data);
            socket.write(reply);
        });
    }

    private async sendFramesWhilePossible() {
        if (await getOptionalUD3Connection()?.setSynth(SynthType.SID, true)) {
            getActiveSIDConnection()?.onStart();
        }
        while (!getActiveSIDConnection()?.isBusy() && this.localBuffer.length > 0) {
            const nextFrame = this.localBuffer.shift();
            await getActiveSIDConnection()?.processFrame(nextFrame);
        }
    }

    private async processFrames(data: number[]): Promise<boolean> {
        if (getActiveSIDConnection()?.isBusy()) {
            return false;
        }
        for (let i = 0; i + 3 < data.length; i += 4) {
            const [delay, register, value] = jspack.Unpack("!HBB", data.slice(i, i + 4));
            this.currentSIDState[register] = value;
            const actualDelay = delay + this.extraDelayNextFrame;
            if (actualDelay > 1000) {
                this.localBuffer.push(new SidFrame(new Uint8Array(this.currentSIDState), actualDelay));
                this.extraDelayNextFrame = 0;
            } else {
                this.extraDelayNextFrame = actualDelay;
            }
        }
        await this.sendFramesWhilePossible();
        return true;
    }

    private async handleMessage(data: Buffer): Promise<Buffer> {
        const [command, sidNum, len] = jspack.Unpack("!BBH", data);
        const additional = Array.from(data).slice(4);
        switch (command) {
            case Command.FLUSH:
                await getActiveSIDConnection()?.flush();
                this.localBuffer = [];
                break;
            case Command.TRY_SET_SID_COUNT:
                if (sidNum > 1) {
                    console.warn("Trying to enabled " + sidNum + " SIDs, only one is supported!");
                }
                break;
            case Command.MUTE:
                // Not supported (?)
                break;
            case Command.TRY_RESET:
                this.currentSIDState.fill(0);
                break;
            case Command.TRY_DELAY:
                const [delay] = jspack.Unpack("!H", additional);
                this.extraDelayNextFrame += delay;
                break;
            case Command.TRY_WRITE:
                if (!await this.processFrames(additional)) {
                    return Buffer.of(ReplyCode.BUSY);
                }
                break;
            case Command.TRY_READ:
                if (!await this.processFrames(additional.slice(0, len - 3))) {
                    return Buffer.of(ReplyCode.BUSY);
                } else {
                    const [delay, registerID] = jspack.Unpack("!HB", additional.slice(len - 3));
                    this.extraDelayNextFrame += delay;
                    // we do not have registers to read from, so we need to hope always reading 0 doesn't break anything
                    return Buffer.of(ReplyCode.READ, 0);
                }
            case Command.GET_VERSION:
                // Do not support any features beyond the basic requirements
                return Buffer.of(ReplyCode.VERSION, 1);
            default:
                console.warn("Unexpected command in SID data packet:", data);
                break;
        }
        return Buffer.of(ReplyCode.OK);
    }
}
