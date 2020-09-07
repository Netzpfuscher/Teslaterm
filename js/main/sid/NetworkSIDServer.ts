import * as net from "net";
import {SynthType} from "../../common/CommonTypes";
import {getOptionalUD3Connection} from "../connection/connection";
import {getActiveSIDConnection} from "./ISidConnection";
import {Command, NTSC, PAL, ReplyCode, TimingStandard} from "./SIDConstants";
import {jspack} from "jspack";
import {FRAME_LENGTH, SidFrame} from "./sid_api";

export class NetworkSIDServer {
    private serverSocket: net.Server;
    private readonly port: number;
    private timeSinceLastFrame: number = 0;
    private currentSIDState: Uint8Array = new Uint8Array(FRAME_LENGTH);
    private localBuffer: SidFrame[] = [];
    private timeStandard: TimingStandard = PAL;

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
            this.timeSinceLastFrame = delay + this.timeSinceLastFrame;
            const cyclesPerFrame = this.timeStandard.cycles_per_frame;
            while (this.timeSinceLastFrame > cyclesPerFrame) {
                this.localBuffer.push(new SidFrame(new Uint8Array(this.currentSIDState), cyclesPerFrame));
                this.timeSinceLastFrame -= cyclesPerFrame;
            }
            this.currentSIDState[register] = value;
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
                this.timeSinceLastFrame += delay;
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
                    this.timeSinceLastFrame += delay;
                    // we do not have registers to read from, so we need to hope always reading 0 doesn't break anything
                    return Buffer.of(ReplyCode.READ, 0);
                }
            case Command.GET_VERSION:
                return Buffer.of(ReplyCode.VERSION, 2);
            case Command.TRY_SET_SAMPLING:
                // Not supported
                break;
            case Command.SET_CLOCKING:
                if (additional[0] == 0) {
                    this.timeStandard = PAL;
                } else {
                    this.timeStandard = NTSC;
                }
                break;
            case Command.GET_CONFIG_COUNT:
                return Buffer.of(ReplyCode.COUNT, 1);
            case Command.GET_CONFIG_INFO:
                return Buffer.concat([
                    Buffer.of(ReplyCode.INFO, 0),
                    Buffer.from("UD3\0")
                ]);
            case Command.SET_SID_POSITION:
            case Command.SET_SID_LEVEL:
            case Command.SET_SID_MODEL:
                // Not supported
                break;

            default:
                console.warn("Unexpected command in SID data packet:", data);
                break;
        }
        return Buffer.of(ReplyCode.OK);
    }
}
