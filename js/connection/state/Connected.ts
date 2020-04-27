import {terminal} from "../../gui/constants";
import * as menu from "../../gui/menu";
import {BootloadableConnection} from "../../network/bootloader/bootloadable_connection";
import * as commands from "../../network/commands";
import {IUD3Connection} from "../IUD3Connection";
import {IConnectionState} from "./IConnectionState";
import {Idle} from "./Idle";
import * as media from "../../media/media_player";
import {Reconnecting} from "./Reconnecting";

const TIMEOUT = 100;
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

        if (this.isConnectionLost()) {
            terminal.io.println("\n\rLost connection, will attempt to reconnect");
            this.active_connection.disconnect();
            return new Reconnecting(this.active_connection);
        }

        wd_reset--;
        if (wd_reset === 0) {
            wd_reset = WD_TIMEOUT;
            this.active_connection.resetWatchdog();
        }
        return this;
    }

    private isConnectionLost(): boolean {
        if (this.active_connection instanceof BootloadableConnection) {
            const bootConnection = this.active_connection as BootloadableConnection;
            if (bootConnection.isBootloading()) {
                //TODO detect lost connection in bootloader mode (and fully disconnect)?
                return false;
            }
        }
        return response_timeout <= 0;
    }

    private async disconnectInternal() {
        try {
            if (media.media_state.state == media.PlayerActivity.playing) {
                media.media_state.stopPlaying();
            }
            await commands.stop();
        } catch (e) {
            console.error("Failed to send stop command:", e);
        }
        await this.active_connection.disconnect();
    }
}
