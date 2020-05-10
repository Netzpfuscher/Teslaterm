import {processIPC} from "../../common/IPCProvider";
import {IPCConstantsToMain, TransmittedFile} from "../../common/IPCConstantsToMain";

export namespace FileUploadIPC {
    export function uploadFile(file: File) {
        file.arrayBuffer()
            .then(buffer => {
                processIPC.send(IPCConstantsToMain.loadFile, file.name, [...new Uint8Array(buffer)]);
            });
    }
}
