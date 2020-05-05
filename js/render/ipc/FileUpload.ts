import {ipcRenderer} from "electron";
import {IPCConstantsToMain, TransmittedFile} from "../../common/IPCConstantsToMain";

export class FileUpload {
    static uploadFile(file: File) {
        file.arrayBuffer()
            .then(buffer => {
                ipcRenderer.send(IPCConstantsToMain.loadFile, new TransmittedFile(file.name, buffer));
            });
    }
}
