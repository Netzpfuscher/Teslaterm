import * as menu from "../../gui/menu";
import * as commands from "../../network/commands";
import {IUD3Connection} from "../IUD3Connection";
import {IConnectionState} from "./IConnectionState";
import {Idle} from "./Idle";

const TIMEOUT = 50;
let response_timeout = TIMEOUT;
const WD_TIMEOUT = 5;
let wd_reset = WD_TIMEOUT;

export function resetResponseTimeout() {
    response_timeout = TIMEOUT;
}

export class Connected implements IConnectionState {
    private readonly active_connection: IUD3Connection;

    public constructor(conn: IUD3Connection) {
        this.active_connection = conn;
    }

    public getActiveConnection(): IUD3Connection | undefined {
        return this.active_connection;
    }

    public getButtonText(): string {
        return "Disconnect";
    }

    public pressButton(): IConnectionState {
        console.log("Disconnecting");
        this.disconnectInternal().then(() => {
            // NOP
        });
        return new Idle();
    }

    public tick(): IConnectionState {
        this.active_connection.tick();
        response_timeout--;

        if (response_timeout === 0) {
            response_timeout = TIMEOUT;
            // terminal.io.println('Connection lost, reconnecting...');

            // TODO: Implement reconnect logic, probably type-specific
        }

        wd_reset--;
        if (wd_reset === 0) {
            wd_reset = WD_TIMEOUT;
            this.active_connection.resetWatchdog();
        }
        return this;
    }

    private async disconnectInternal() {
        await commands.stop();
        await this.active_connection.disconnect();
    }
}
