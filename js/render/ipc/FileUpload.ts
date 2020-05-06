import {ipcRenderer} from "electron";
import {IPCConstantsToMain, TransmittedFile} from "../../common/IPCConstantsToMain";

export namespace FileUploadIPC {
    export function uploadFile(file: File) {
        file.arrayBuffer()
            .then(buffer => {
                console.log("Contents: " + buffer);
                ipcRenderer.send(IPCConstantsToMain.loadFile, new TransmittedFile(file.name, new Uint8Array(buffer)));
            });
    }
}
