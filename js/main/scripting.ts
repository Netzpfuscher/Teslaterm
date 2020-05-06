import * as fs from "fs";
import * as vm from 'vm';
import {commands} from "./connection/connection";
import * as helper from './helper';
import {Sliders} from "./ipc/sliders";
import {TerminalIPC} from "./ipc/terminal";
import * as media_player from './media/media_player';

let running = false;
let interrupt = null;
let queue: (Array<() => Promise<any>> | null) = null;

const maxQueueLength = 1000;

function wrapForSandboxNonPromise(func: (...args: any[]) => void): (...args: any[]) => void {
    return wrapForSandbox((...args) => {
        func(...args);
        return Promise.resolve();
    });
}

function wrapForSandbox(func: (...args: any[]) => Promise<any>, context?: any): (...args: any[]) => void {
    if (!context) {
        context = this;
    }
    // tslint:disable-next-line:only-arrow-functions
    const wrapped = function(): Promise<any> {
        if (running) {
            return func.apply(context, arguments);
        }
        throw new Error("Script was interrupted");
    };
    // tslint:disable-next-line:only-arrow-functions
    return function() {
        if (queue.length >= maxQueueLength) {
            throw new Error("Maximum queue length reached! " + queue.length);
        }
        const args = arguments;
        queue.push(() => wrapped.apply(context, args));
    };
}

function timeoutSafe(delay): Promise<any> {
    let resolve = () => {
    };
    let reject = (msg: string) => {
    };
    const ret = new Promise<void>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    const timeoutId = setTimeout(() => {
        interrupt = null;
        resolve();
    }, delay);
    interrupt = () => {
        clearTimeout(timeoutId);
        reject("Canceled");
    };
    return ret;
}

function playMediaBlocking(): Promise<any> {
    return new Promise((resolve, reject) => {
        onMidiStopped = () => {
            onMidiStopped = () => {
            };
            interrupt = null;
            resolve();
        };
        interrupt = () => {
            media_player.media_state.stopPlaying();
            reject("Canceled");
        };
        media_player.media_state.startPlaying();
    });
}

function waitForConfirmation(text, title): Promise<any> {
    return new Promise((resolve, reject) => {
        w2confirm(text, title)
            .yes(resolve)
            .no(() => {
                reject("User did not confirm");
            });
    });
}

export async function loadScript(content: Uint8Array): Promise<Array<() => Promise<any>>> {
    const code = helper.convertArrayBufferToString(content, false);
    queue = [];
    const sandbox = vm.createContext({
        // Useful but harmless APIs
        Math,
        // calls for the queue
        delay: wrapForSandbox(timeoutSafe),
        loadMediaFile: wrapForSandbox(media_player.loadMediaFile),
        playMediaAsync: wrapForSandboxNonPromise(media_player.media_state.startPlaying),
        playMediaBlocking: wrapForSandbox(playMediaBlocking),
        println: wrapForSandbox((s) => {
            TerminalIPC.println(s);
            return Promise.resolve();
        }),
        setBPS: wrapForSandboxNonPromise(commands.setBPS),
        setBurstOfftime: wrapForSandboxNonPromise(commands.setBurstOfftime),
        setBurstOntime: wrapForSandboxNonPromise(commands.setBurstOntime),
        setOntime: wrapForSandboxNonPromise((s) => {
            commands.setRelativeOntime(s);
            return Promise.resolve();
        }),
        setTransientMode: wrapForSandboxNonPromise(commands.setTransientEnabled),
        stopMedia: wrapForSandboxNonPromise(media_player.media_state.stopPlaying),
        waitForConfirmation: wrapForSandbox(waitForConfirmation),
    });
    vm.runInContext(code, sandbox, {timeout: 1000});
    const retQueue = queue;
    queue = null;
    return retQueue;
}

export function startScript(script_queue: Array<() => Promise<any>>) {
    if (running) {
        TerminalIPC.println("The script is already running.");
        return;
    }
    let script = Promise.resolve();
    running = true;
    Sliders.setRelativeAllowed(false);
    for (const entry of script_queue) {
        script = script.then(entry);
    }
    script.then(() => {
        running = false;
        TerminalIPC.println("Script finished normally");
    }).catch((e) => {
        running = false;
        TerminalIPC.println("Script finished with error: " + e);
        console.error(e);
    }).then(() => Sliders.setRelativeAllowed(true));
}

export function cancel() {
    running = false;
    if (interrupt) {
        interrupt();
        interrupt = null;
    }
}

export function isRunning(): boolean {
    return running;
}

export let onMidiStopped = () => {
};
