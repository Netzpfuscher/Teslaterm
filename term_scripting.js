const vm = require('vm');
const fs = require('fs');
let running = false;
let interrupt = null;
let queue = null;
let timeoutDate = null;
//local copies of variables
let terminal = null;
let player = null;
let startCurrentMidiFile = null;
let stopMidiFile = null;
let arrayBufferToString = null;
let setOntime = null;
let setBPS = null;
let setBurstOntime = null;
let setBurstOfftime = null;
let startTransient = null;
let stopTransient = null;
let showConfirmDialog = null;

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
		queue.push(()=>wrapped.apply(this, arguments));
	}
}

function timeoutSafe(delay) {
	let resolve;
	const ret = new Promise(res=>resolve = res);
	const timeoutId = setTimeout(()=> {
		interrupt = null;
		resolve();
	}, delay);
	interrupt = ()=> {
		clearTimeout(timeoutId);
	};
	return ret;
}

function playMidiBlocking() {
	let resolve;
	const ret = new Promise(res => resolve = res);
	exports.onMidiStopped = () => {
		exports.onMidiStopped = () => {
		};
		interrupt = null;
		resolve();
	};
	interrupt = () => {
		player.stop();
	};
	startCurrentMidiFile();
	return ret;
}

function setTransientMode(enable) {
	if (enable) {
		startTransient();
	} else {
		stopTransient();
	}
}

function waitForConfirmation(text, title) {
	let resolve;
	const ret = new Promise(res=>resolve = res);
	showConfirmDialog(text, title)
		.yes(resolve)
		.no(()=>{
			throw "User did not confirm";
		});
	return ret;
}

exports.init = (...args)=> {
	[terminal,
		player,
		startCurrentMidiFile,
		stopMidiFile,
		arrayBufferToString,
		setOntime,
		setBPS,
		setBurstOntime,
		setBurstOfftime,
		startTransient,
		stopTransient,
		showConfirmDialog] = args;
};

exports.loadScript = (file)=> {
	let resolve = () => {
	};
	let reject = () => {
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
			const code = arrayBufferToString(content, false);
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
				setOntime: wrapForSandbox(setOntime),
				setBPS: wrapForSandbox(setBPS),
				setBurstOntime: wrapForSandbox(setBurstOntime),
				setBurstOfftime: wrapForSandbox(setBurstOfftime),
				setTransientMode: wrapForSandbox(setTransientMode),
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
};

exports.startScript = (queue)=> {
	let script = Promise.resolve();
	running = true;
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
	});
};

exports.cancel = ()=> {
	running = false;
	if (interrupt) {
		interrupt();
		interrupt = null;
		terminal.io.println("Script was interrupted");
	}
};

exports.isRunning = ()=> running;

exports.onMidiStopped = ()=>{};