import {terminal} from "../../gui/constants";
import {sleep} from "../../helper";
import {BootloadableConnection} from "../bootloader/bootloadable_connection";
import {Bootloader} from "../bootloader/bootloader";
import {sendCommand} from "../commands";
import {IUD3Connection} from "../types/IUD3Connection";
import {IConnectionState} from "./IConnectionState";
import {Idle} from "./Idle";
import {Reconnecting} from "./Reconnecting";

export class Bootloading implements IConnectionState {
    private readonly connection: BootloadableConnection;
    private done: boolean = false;
    private cancelled: boolean = false;
    private inBootloadMode: boolean = false;

    constructor(connection: BootloadableConnection, file: File) {
        this.connection = connection;
        this.bootload(file)
            .catch(
                (e) => {
                    console.error(e);
                    terminal.io.println("Error while bootloading: " + e);
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

    private async bootload(file: File) {
        try {
            const ldr = new Bootloader();
            await ldr.loadCyacd(file.path);
            await sendCommand('\rbootloader\r');
            terminal.io.println("Waiting for bootloader to start...");
            await sleep(3000);
            this.connection.enterBootloaderMode((data) => {
                ldr.onDataReceived(data);
            });
            this.inBootloadMode = true;
            terminal.io.println("Connecting to bootloader...");
            ldr.set_info_cb((str: string) => terminal.io.println(str));
            ldr.set_progress_cb((percentage) => {
                terminal.io.print('\x1B[2K');
                terminal.io.print('\r|');
                for (let i = 0; i < 50; i++) {
                    if (percentage >= (i * 2)) {
                        terminal.io.print('=');
                    } else {
                        terminal.io.print('.');
                    }
                }
                terminal.io.print('| ' + percentage + '%');
            });
            ldr.set_write_cb((data) => {
                return this.connection.sendBootloaderData(data);
            });
            await ldr.connectAndProgram();
        } catch (e) {
            console.error(e);
            terminal.io.println("Error while bootloading: " + e);
        }
        if (this.inBootloadMode) {
            this.connection.leaveBootloaderMode();
        }
    }
}
