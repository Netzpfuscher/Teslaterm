import * as vm from 'vm';
import * as sliders from './gui/sliders';
import * as helper from './helper';
import * as commands from './network/commands';
import {terminal} from "./gui/gui";
import * as media_player from './media/media_player';
import * as fs from "fs";

let running = false;
let interrupt = null;
let queue: ((() => Promise<any>)[] | null) = null;

const maxQueueLength = 1000;

function wrapForSandboxNonPromise(func: (...args: any[]) => void, context?: Object): (...args: any[]) => void {
	return wrapForSandbox((...args) => {
		func(...args);
		return Promise.resolve();
	});
}

function wrapForSandbox(func: (...args: any[]) => Promise<any>, context?: Object): (...args: any[]) => void {
	if (!context) {
		context = this;
	}
	const wrapped = function (): Promise<any> {
		if (running) {
			return func.apply(context, arguments);
		}
		throw "Script was interrupted";
	};
	return function () {
		if (queue.length >= maxQueueLength) {
			throw "Maximum queue length reached! " + queue.length;
		}
		const args = arguments;
		queue.push(()=>wrapped.apply(context, args));
	};
}

function timeoutSafe(delay): Promise<any> {
	let resolve = () => {
	}, reject = (msg: string) => {
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
			media_player.stopPlaying();
			reject("Canceled");
		};
		media_player.startPlaying();
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

export async function loadScript(file: fs.PathLike): Promise<(() => Promise<any>)[]> {
	const content = await helper.readFileAsync(file);
	const code = helper.convertArrayBufferToString(content, false);
	queue = [];
	const sandbox = vm.createContext({
		// Useful but harmless APIs
		Math: Math,
		// calls for the queue
		delay: wrapForSandbox(timeoutSafe),
		println: wrapForSandbox(s => terminal.io.println(s)),
		playMediaBlocking: wrapForSandbox(playMediaBlocking),
		playMediaAsync: wrapForSandboxNonPromise(media_player.startPlaying),
		stopMedia: wrapForSandboxNonPromise(media_player.stopPlaying),
		setOntime: wrapForSandboxNonPromise(s => sliders.ontime.setRelativeOntime(s)),
		setBPS: wrapForSandboxNonPromise(sliders.setBPS),
		setBurstOntime: wrapForSandboxNonPromise(sliders.setBurstOntime),
		setBurstOfftime: wrapForSandboxNonPromise(sliders.setBurstOfftime),
		setTransientMode: wrapForSandboxNonPromise(commands.setTransientEnabled),
		waitForConfirmation: wrapForSandbox(waitForConfirmation),
		loadMediaFile: wrapForSandbox(media_player.loadMediaFile)
	});
	vm.runInContext(code, sandbox, {timeout: 1000});
	const retQueue = queue;
	queue = null;
	return retQueue;
}

export function startScript(queue: (() => Promise<any>)[]) {
	if (running) {
		terminal.io.println("The script is already running.");
		return;
	}
	let script = Promise.resolve();
	running = true;
	sliders.ontime.setRelativeAllowed(false);
	for (let i = 0; i < queue.length; i++) {
		script = script.then(queue[i]);
	}
	script.then(()=> {
		running = false;
		terminal.io.println("Script finished normally");
	}).catch(e=> {
		running = false;
		terminal.io.println("Script finished with error: "+e);
		console.error(e);
	}).then(()=>sliders.ontime.setRelativeAllowed(true));
}
export function cancel () {
	running = false;
	if (interrupt) {
		interrupt();
		interrupt = null;
	}
}
export function isRunning ():boolean {
	return running;
}

export let onMidiStopped: Function = ()=>{};