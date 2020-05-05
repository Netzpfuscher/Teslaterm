import {CommandInterface} from "../../common/commands";
import {SynthType} from "../../common/CommonTypes";
import {IPCConstantsToMain} from "../../common/IPCConstantsToMain";
import {terminal} from "../gui/constants";
import {ipcRenderer} from "electron";

export const commands = new CommandInterface(
    c => {
        ipcRenderer.send(IPCConstantsToMain.command, c);
        //TODO?
        return Promise.resolve();
    },
    () => {
        // \033=\u1B
        terminal.io.print('\u001B[2J\u001B[0;0H');
    },
    (val: number) => {
        throw new Error();
    },
    async (t: SynthType) => {
        throw new Error();
    }
);
