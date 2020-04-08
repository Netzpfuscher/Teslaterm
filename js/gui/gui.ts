import "electron";
import * as media_player from "../media/media_player";
import {BootloadableConnection} from "../network/bootloadable_connection";
import {loadCyacd} from "../network/bootloader/bootloader_handler";
import * as cmd from "../network/commands";
import {connection} from "../network/connection";
import * as scripting from "../scripting";
import {loadSidFile} from "../sid/sid";
import {terminal} from "./constants";
import * as gauges from "./gauges";
import {setScript} from "./menu";

export function init(): void {
    document.getElementById("layout").addEventListener("drop", ondrop);
    document.getElementById("layout").addEventListener("dragover", ondragover);

    terminal.onTerminalReady = () => {
        const io = terminal.io.push();

        terminal.processInput = cmd.sendCommand;
        io.onVTKeystroke = terminal.processInput;

        io.sendString = terminal.processInput;
    };
    gauges.init();
}


async function ondrop(e: DragEvent): Promise<void> {
    e.stopPropagation();
    e.preventDefault();
    if (e.dataTransfer.items.length === 1) {// only one file
        const file = e.dataTransfer.files[0];
        const extension = file.name.substring(file.name.lastIndexOf(".") + 1);
        if (extension === "js") {
            scripting.loadScript(file.path)
                .then((script) => {
                    setScript(script);
                    w2ui.toolbar.get("mnu_script").text = "Script: " + file.name;
                    w2ui.toolbar.refresh();
                })
                .catch((err) => {
                    terminal.io.println("Failed to load script: " + err);
                    console.log(err);
                });
        } else if (extension === "cyacd") {
            if (connection instanceof BootloadableConnection) {
                await loadCyacd(file, connection);
            } else {
                terminal.io.println("Connection does not support bootloading");
            }
        } else {
            await media_player.loadMediaFile(file.path);
        }
    }
}

function ondragover(e: DragEvent): void {
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
}
