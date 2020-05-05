import {sleep} from "../../helper";
import {Terminal} from "../../ipc/terminal";
import {BootloadableConnection} from "../bootloader/bootloadable_connection";
import {Bootloader} from "../bootloader/bootloader";
import {commands} from "../connection";
import {IUD3Connection} from "../types/IUD3Connection";
import {IConnectionState} from "./IConnectionState";
import {Idle} from "./Idle";
import {Reconnecting} from "./Reconnecting";

export class Bootloading implements IConnectionState {
    private readonly connection: BootloadableConnection;
    private done: boolean = false;
    private cancelled: boolean = false;
    private inBootloadMode: boolean = false;

    constructor(connection: BootloadableConnection, file: ArrayBuffer) {
        this.connection = connection;
        this.bootload(file)
            .catch(
                (e) => {
                    console.error(e);
                    Terminal.println("Error while bootloading: " + e);
                }
            )
            .then(
                () => {
                    this.done = true;
                }
            );
    }

    getActiveConnection(): IUD3Connection | undefined {
        if (this.inBootloadMode) {
            return undefined;
        } else {
            return this.connection;
        }
    }

    getButtonText(): string {
        return "Abort bootloading";
    }

    pressButton(): IConnectionState {
        this.cancelled = true;
        this.connection.disconnect();
        return new Idle();
    }

    tick(): IConnectionState {
        if (this.done) {
            this.connection.disconnect();
            return new Reconnecting(this.connection);
        } else {
            return this;
        }
    }

    private async bootload(file: ArrayBuffer) {
        try {
            const ldr = new Bootloader();
            await ldr.loadCyacd(file);
            await commands.sendCommand('\rbootloader\r');
            Terminal.println("Waiting for bootloader to start...");
            await sleep(3000);
            this.connection.enterBootloaderMode((data) => {
                ldr.onDataReceived(data);
            });
            this.inBootloadMode = true;
            Terminal.println("Connecting to bootloader...");
            ldr.set_info_cb((str: string) => Terminal.println(str));
            ldr.set_progress_cb((percentage) => {
                Terminal.print('\x1B[2K');
                Terminal.print('\r|');
                for (let i = 0; i < 50; i++) {
                    if (percentage >= (i * 2)) {
                        Terminal.print('=');
                    } else {
                        Terminal.print('.');
                    }
                }
                Terminal.print('| ' + percentage + '%');
            });
            ldr.set_write_cb((data) => {
                return this.connection.sendBootloaderData(data);
            });
            await ldr.connectAndProgram();
        } catch (e) {
            console.error(e);
            Terminal.println("Error while bootloading: " + e);
        }
        if (this.inBootloadMode) {
            this.connection.leaveBootloaderMode();
        }
    }
}
