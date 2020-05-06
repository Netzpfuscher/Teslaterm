import {TerminalIPC} from "../../ipc/terminal";
import {IUD3Connection} from "../types/IUD3Connection";
import {Connecting} from "./Connecting";
import {IConnectionState} from "./IConnectionState";
import {Idle} from "./Idle";

export class Reconnecting implements IConnectionState {
    private static readonly MAX_RETRIES = 5;
    private static readonly TICKS_BETWEEN_RETRIES = 100;
    private ticksSinceLastFailure: number = 0;
    private failedAttempts: number = 0;
    private readonly connectionToReestablish: IUD3Connection;

    public constructor(connection: IUD3Connection) {
        this.connectionToReestablish = connection;
    }

    getActiveConnection(): IUD3Connection | undefined {
        return undefined;
    }

    getButtonText(): string {
        return "Abort reconnection attempt";
    }

    pressButton(): IConnectionState {
        return new Idle();
    }

    tick(): IConnectionState {
        if (this.failedAttempts >= Reconnecting.MAX_RETRIES) {
            TerminalIPC.println("Aborting attempts to reconnect");
            return new Idle();
        }
        ++this.ticksSinceLastFailure;
        if (this.ticksSinceLastFailure > Reconnecting.TICKS_BETWEEN_RETRIES) {
            ++this.failedAttempts;
            this.ticksSinceLastFailure = 0;
            TerminalIPC.println("Attempting to reconnect (attempt " +
                this.failedAttempts.toString(10) + " of " + Reconnecting.MAX_RETRIES.toString(10) + ")...");
            return new Connecting(Promise.resolve(this.connectionToReestablish), this);
        } else {
            return this;
        }
    }
}
