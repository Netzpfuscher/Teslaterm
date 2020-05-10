import {IPCProvider, setIPC} from "../common/IPCProvider";
import {init} from './init';

const serverComms = io();

class IPC implements IPCProvider {
    on(channel: string, callback: (...args: any[]) => void) {
        serverComms.on(channel, callback);
    }

    once(channel: string, callback: (...args: any[]) => void) {
        serverComms.once(channel, callback);
    }

    send(channel: string, ...args: any[]) {
        serverComms.emit(channel, ...args);
    }
}

setIPC(new IPC());
init();
