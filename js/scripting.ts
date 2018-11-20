import * as vm from 'vm';
import * as fs from 'fs';
import * as sliders from './gui/sliders';
import * as helper from './helper';
import * as commands from './network/commands';
import {terminal} from "./gui/gui";

let running = false;
let interrupt = null;
let queue = null;
let timeoutDate = null;

const maxQueueLength = 1000;
const timeout = 1000;

function wrapForSandbox(func) {
	const wrapped = function() {
		if (running) {
			return func.apply(this, arguments);
		}
		throw "Script was interrupted";
	};
	return function() {
		if (new Date().getTime()>timeoutDate) {
			throw "Script timed out!";
		}
		if (queue.length>=maxQueueLength) {
			throw "Maximum queue length reached! "+queue.length;
		}
		const args = arguments;
		queue.push(()=>wrapped.apply(this, args));
	};
}

function timeoutSafe(delay) {
	let resolve = ()=>{}, reject = (msg:string)=>{};
	const ret = new Promise<void>((res, rej)=>{
		resolve = res;
		reject = rej;
	});
	const timeoutId = setTimeout(()=> {
		interrupt = null;
		resolve();
	}, delay);
	interrupt = ()=> {
		clearTimeout(timeoutId);
		reject("Canceled");
	};
	return ret;
}

function playMidiBlocking() {
	let resolve = ()=>{}, reject = (err)=>{};
	const ret = new Promise((res, rej)=>{
		resolve = res;
		reject = rej;
	});
	exports.onMidiStopped = () => {
		exports.onMidiStopped = () => {
		};
		interrupt = null;
		resolve();
	};
	interrupt = () => {
		midi.player.stop();
		reject("Canceled");
	};
	startCurrentMidiFile();
	return ret;
}

function waitForConfirmation(text, title) {
	let resolve;
	const ret = new Promise(res=>resolve = res);
	w2ui.showConfirmDialog(text, title)
		.yes(resolve)
		.no(()=>{
			throw "User did not confirm";
		});
	return ret;
}

export function loadScript(file) {
	let resolve = (queue) => {
	};
	let reject = (err) => {
	};
	const ret = new Promise((res, rej) => {
		resolve = res;
		reject = rej;
	});
	fs.readFile(file, {}, (error, content) => {
		try {
			if (error) {
				reject(error);
				return;
			}
			const code = helper.convertArrayBufferToString(content, false);
			timeoutDate = new Date().getTime()+timeout;
			queue = [];
			const sandbox = vm.createContext({
				// Useful but harmless APIs
				Math: Math,
				// calls for the queue
				delay: wrapForSandbox(timeoutSafe),
				println: wrapForSandbox(s => terminal.io.println(s)),
				playMidiBlocking: wrapForSandbox(playMidiBlocking),
				playMidiAsync: wrapForSandbox(startCurrentMidiFile),
				stopMidi: wrapForSandbox(stopMidiFile),
				setOntime: wrapForSandbox(sliders.ontime.setRelativeOntime),
				setBPS: wrapForSandbox(sliders.setBPS),
				setBurstOntime: wrapForSandbox(sliders.setBurstOntime),
				setBurstOfftime: wrapForSandbox(sliders.setBurstOfftime),
				setTransientMode: wrapForSandbox(commands.setTransientEnabled),
				waitForConfirmation: wrapForSandbox(waitForConfirmation)
			});
			vm.runInContext(code, sandbox);
			const retQueue = queue;
			queue = null;
			resolve(retQueue);
		} catch (x) {
			reject(x);
		}
	});
	return ret;
}
export function startScript (queue) {
	if (running) {
		terminal.io.println("The script is already running.");
		return;
	}
	let script = Promise.resolve();
	running = true;
	sliders.ontime.setRelativeAllowed(false);
	for (let i = 0;i<queue.length;i++) {
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
export function isRunning ()  {
	return running;
}

export function onMidiStopped() {
}