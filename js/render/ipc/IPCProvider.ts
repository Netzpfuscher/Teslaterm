export interface IPCProvider {
    send(channel: string, ...args: any[]);

    on(channel: string, callback: (...args: any[]) => void);

    once(channel: string, callback: (...args: any[]) => void);
}

export class DummyIPC implements IPCProvider {
    on(channel: string, callback: (...args: any[]) => void) {
    }

    send(channel: string, ...args: any[]) {
    }

    once(channel: string, callback: (...args: any[]) => void) {
    }
}

export let processIPC: IPCProvider = new DummyIPC();

export function setIPC(ipc: IPCProvider) {
    processIPC = ipc;
}
