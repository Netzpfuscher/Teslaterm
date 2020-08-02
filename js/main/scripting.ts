import * as JSZip from "jszip";
import * as vm from 'vm';
import {TransmittedFile} from "../common/IPCConstantsToMain";
import {commands} from "./connection/connection";
import {Sliders} from "./ipc/sliders";
import {TerminalIPC} from "./ipc/terminal";
import {isMediaFile, media_state} from "./media/media_player";
import * as media_player from './media/media_player';

const maxQueueLength = 1000;

class ScriptQueueEntry {
    public readonly run: () => Promise<void>;
    public readonly assertApplicable: () => Promise<void>;

    constructor(run: () => Promise<void>, assertApplicable: () => Promise<void>) {
        this.run = run;
        this.assertApplicable = assertApplicable;
    }
}

export class Script {
    private running: boolean = false;
    private interruptFunc: (() => any) | null = null;
    private readonly queue: ScriptQueueEntry[];
    private readonly zip: JSZip;

    private constructor(zip: JSZip, code: string) {
        this.zip = zip;
        this.queue = [];
        const sandbox = vm.createContext({
            // Useful but harmless APIs
            Math,
            // calls for the queue
            delay: this.wrapForSandbox((delay) => this.timeoutSafe(delay)),
            loadMediaFile: this.wrapForSandboxWithCheck(f => this.loadMediaFile(f), f => this.assertFileExists(f)),
            playMediaAsync: this.wrapForSandboxNonPromise(() => media_player.media_state.startPlaying()),
            playMediaBlocking: this.wrapForSandbox(() => this.playMediaBlocking()),
            println: this.wrapForSandbox((s) => {
                TerminalIPC.println(s);
                return Promise.resolve();
            }),
            setBPS: this.wrapForSandboxNonPromise(d => commands.setBPS(d)),
            setBurstOfftime: this.wrapForSandboxNonPromise(d => commands.setBurstOfftime(d)),
            setBurstOntime: this.wrapForSandboxNonPromise(d => commands.setBurstOntime(d)),
            setOntime: this.wrapForSandboxNonPromise(d => commands.setRelativeOntime(d)),
            setTransientMode: this.wrapForSandboxNonPromise(enabled => commands.setTransientEnabled(enabled)),
            stopMedia: this.wrapForSandboxNonPromise(() => media_player.media_state.stopPlaying()),
            waitForConfirmation: this.wrapForSandbox(waitForConfirmation),
        });
        try {
            vm.runInContext(code, sandbox, {timeout: 1000});
        } catch (e) {
            console.log("Err");
        }
    }

    public static async create(zipData: ArrayBuffer): Promise<Script | null> {
        const zip = await JSZip.loadAsync(zipData);
        const script = await zip.file("main.js").async("string");
        const ret = new Script(zip, script);
        for (const entry of ret.queue) {
            await entry.assertApplicable();
        }
        return ret;
    }

    public cancel() {
        this.running = false;
        if (this.interruptFunc) {
            this.interruptFunc();
            this.interruptFunc = null;
        }
    }

    public isRunning(): boolean {
        return this.running;
    }

    public async start() {
        if (this.running) {
            TerminalIPC.println("The script is already running.");
            return;
        }
        Sliders.setRelativeAllowed(false);
        this.running = true;
        try {
            for (const entry of this.queue) {
                if (!this.isRunning()) {
                    TerminalIPC.println("Cancelled script");
                    break;
                }
                await entry.run();
            }
            if (this.isRunning()) {
                TerminalIPC.println("Script finished normally");
            }
        } catch (x) {
            TerminalIPC.println("Script finished with error: " + x);
            console.error(x);
        }
        this.running = false;
        Sliders.setRelativeAllowed(true);
    }

    private wrapForSandboxNonPromise(func: (...args: any[]) => void): (...args: any[]) => void {
        return this.wrapForSandbox((...args) => {
            func(...args);
            return Promise.resolve();
        });
    }

    private wrapForSandbox(func: (...args: any[]) => Promise<any>): (...args: any[]) => void {
        return this.wrapForSandboxWithCheck(func, () => Promise.resolve());
    }

    private wrapForSandboxWithCheck(
        func: (...args: any[]) => Promise<any>,
        check: (...args: any[]) => Promise<any>,
    ): (...args: any[]) => void {
        return (...args) => {
            if (this.queue.length >= maxQueueLength) {
                throw new Error("Maximum queue length reached! " + this.queue.length);
            }
            this.queue.push(new ScriptQueueEntry(() => func(...args), () => check(...args)));
        };
    }

    private timeoutSafe(delay): Promise<any> {
        return new Promise<void>((res, rej) => {
            const timeoutId = setTimeout(() => {
                this.interruptFunc = null;
                res();
            }, delay);
            this.interruptFunc = () => {
                clearTimeout(timeoutId);
                rej("Canceled");
            };
        });
    }

    private playMediaBlocking(): Promise<any> {
        return new Promise((resolve, reject) => {
            onMediaStopped = () => {
                onMediaStopped = () => {
                };
                this.interruptFunc = null;
                resolve();
            };
            this.interruptFunc = () => {
                media_player.media_state.stopPlaying();
                reject("Canceled");
            };
            media_player.media_state.startPlaying();
        });
    }

    private async assertFileExists(file: string) {
        if (!isMediaFile(file)) {
            throw new Error("\"" + file + "\" cannot be loaded as a media file!");
        }
        const fileInZip = this.zip.file(file);
        if (!fileInZip) {
            throw new Error("File \"" + file + "\" does not exist in zip");
        }
    }

    private async loadMediaFile(file: string) {
        const fileInZip = this.zip.file(file);
        const contents = await fileInZip.async("uint8array");
        await media_player.loadMediaFile(new TransmittedFile(file, contents));
    }
}

function waitForConfirmation(text, title): Promise<any> {
    return new Promise((resolve, reject) => {
        resolve();
        //TODO this needs IPC
        //w2confirm(text, title)
        //    .yes(resolve)
        //    .no(() => {
        //        reject("User did not confirm");
        //    });
    });
}

export let onMediaStopped = () => {
};
