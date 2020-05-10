import {commands} from "../ipc/commands";
import {FileUploadIPC} from "../ipc/FileUpload";
import {terminal} from "./constants";
import * as gauges from "./gauges";

export function init(): void {
    document.getElementById("layout").addEventListener("drop", ondrop);
    document.getElementById("layout").addEventListener("dragover", ondragover);

    terminal.onTerminalReady = () => {
        const io = terminal.io.push();

        terminal.processInput = commands.sendCommand;
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
        FileUploadIPC.uploadFile(file);
    }
}

function ondragover(e: DragEvent): void {
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
}
