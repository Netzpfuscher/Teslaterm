import {init} from './init';
import {ipcRenderer} from 'electron';
import {IPCProvider, setIPC} from "./ipc/IPCProvider";

class ElectronIPC implements IPCProvider {
    on(channel: string, callback: (...args: any[]) => void) {
        ipcRenderer.on(channel, (ev, ...args) => callback(...args));
    }

    send(channel: string, ...args: any[]) {
        ipcRenderer.send(channel, ...args);
    }

    once(channel: string, callback: (...args: any[]) => void) {
        ipcRenderer.once(channel, (ev, ...args) => callback(...args));
    }
}

setIPC(new ElectronIPC());
init();
