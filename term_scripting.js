const vm = require('vm');
const fs = require('fs');
let running = false;
let interrupt = null;
let queue = null;
//local copies of variables
let terminal = null;
let player = null;
let startCurrentMidiFile = null;
let arrayBufferToString = null;

function wrapForSandbox(func) {
	const wrapped = function() {
		if (running) {
			return func.apply(this, arguments);
		}
		throw "Script was interrupted";
	};
	return function() {
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
const sandbox= vm.createContext({
	delay: wrapForSandbox(timeoutSafe),
	println: wrapForSandbox(s => terminal.io.println(s)),
	playMidiBlocking: wrapForSandbox(playMidiBlocking),
	playMidiAsync: wrapForSandbox(startCurrentMidiFile),
	stopMidi: wrapForSandbox(() => player.stop())
});

exports.init = (term, Player, startMidi, convertArrayBufferToString)=> {
	terminal = term;
	player = Player;
	startCurrentMidiFile = startMidi;
	arrayBufferToString = convertArrayBufferToString;
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
			const code = arrayBufferToString(content);
			console.log(code);
			queue = [];
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