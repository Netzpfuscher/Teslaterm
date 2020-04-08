// TODO rename file
import {promisify} from "util";
import {terminal} from "../../gui/constants";
import {BootloadableConnection} from "../bootloadable_connection";
import {sendCommand} from "../commands";
import {Bootloader} from "./bootloader";

async function sleep(delay: number): Promise<void> {
    return new Promise<void>((res, rej) => {
        setTimeout(res, delay);
    });
}

export async function loadCyacd(file: File, active_connection: BootloadableConnection): Promise<void> {
    await sendCommand('\rbootloader\r');
    const ldr = new Bootloader();
    active_connection.enterBootloaderMode((data) => {
        ldr.on_read(data);
    });
    console.log("Sent command, waiting");
    await sleep(1000);
    console.log("Wait done");
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
        return active_connection.sendBootloaderData(data);
    });
    console.log("Connecting");
    await ldr.connect();
    console.log("Connected");
    await ldr.cyacd(file);
    console.log("Done");
    active_connection.leaveBootloaderMode();
}
