import {TRIGGER_SPACE} from "./js/gui/gui";
import {scope} from "./js/gui/oscilloscope";

var connid;
var connected = 0;
var path;
const wavecolor = ["white", "red", "blue", "green", "rgb(255, 128, 0)", "rgb(128, 128, 64)", "rgb(128, 64, 128)", "rgb(64, 128, 128)", "DimGray"];
var pixel = 1;
var midi_state=[];
const simulated = false;

const kill_msg = new Uint8Array([0xB0,0x77,0x00]);

const NUM_GAUGES = 7;

var ctx;

hterm.defaultStorage = new lib.Storage.Memory();

const terminal = new hterm.Terminal();

var waveCanvas;
var backcanvas;

var TIMEOUT = 50;
var response_timeout = 50;  // 50 * 20ms = 1s

const WD_TIMEOUT = 5;
var wd_reset = 5;  // 5 * 20ms = 160ms
var wd_reset_msg=new Uint8Array([0xF0,0x0F,0x00]);

var socket;
var socket_midi;

var ipaddr="0.0.0.0";

var blink=0;
var coil_hot_led=0;
var cycle_led=0;

var draw_mode=0;

var midiServer;


var uitime = setInterval(refresh_UI, 20);
const scripting = require('./js/scripting');
let currentScript = null;
var ontimeUI = {totalVal: 0, relativeVal: 100, absoluteVal: 0};



const byt = 29*2;
var sid_marker = new Uint8Array([0xFF,0xFF,0xFF,0xFF]);
var frame_cnt=byt
var frame_cnt_old=0;
var flow_ctl=1;
function refresh_UI(){
	

	if(connected){
		response_timeout--;
	
		if(response_timeout==0){
			response_timeout=TIMEOUT;
			terminal.io.println('Connection lost, reconnecting...');
	
			reconnect();
			chrome.sockets.tcp.getInfo(socket_midi, midi_socket_ckeck);
			chrome.sockets.tcp.getInfo(socket, telnet_socket_ckeck);

			
		}
		
		wd_reset--;
		if(wd_reset==0){
			wd_reset=WD_TIMEOUT;
			if(connected==2){
				chrome.serial.send(connid, wd_reset_msg, sendcb);
			}
			if(connected==1){
				if(socket_midi){
					//chrome.sockets.tcp.send(socket_midi, wd_reset_msg, sendmidi);
				}
			}
		}
		
		
	}
	
	blink++;
	if(blink>25){
		blink=0;
		if(coil_hot_led){
			cycle_led=!cycle_led;
			nano_led(simpleIni.nano.killreset,cycle_led);
		}
	}
	meters.refresh();
	
	if(sid_state==2 && flow_ctl==1){
		if(connected==1){
			if(socket_midi){
				
				chrome.sockets.tcp.send(socket_midi, sid_file_marked.slice(frame_cnt_old,frame_cnt), sendmidi);

			}
			//console.log(sid_file_marked.slice(frame_cnt_old,frame_cnt));
			frame_cnt_old=frame_cnt;
			frame_cnt+=byt;
			if(frame_cnt>sid_file_marked.byteLength){
				sid_state=0;
				frame_cnt=byt;
				frame_cnt_old=0;
				console.log("finished");
			}

		}
	}
	
}

function sendcb(info){
	//console.log(info);
   //println("send " + info.bytesSent + " bytes");
   //println("error: " + info.error);
}

function sendtel(info){
	//if(info.result<0){
	//	reconnect_tel();
	//	console.log("Telnet_Reconnect");
	//}
   //println("send " + info.bytesSent + " bytes");
   //println("error: " + info.error);
}

function sendmidi(info){

	//if(info.result<0){
	//	reconnect_midi();
	//	console.log("MIDI_Reconnect");
	//}
   //println("send " + info.bytesSent + " bytes");
   //println("error: " + info.error);
}


var expectedByteCounts = {
	0x80: 3,
	0x90: 3,
	0xA0: 3,
	0xB0: 3,
	0xC0: 2,
	0xD0: 2,
	0xE0: 3
};

function playMidiData(data) {
	var firstByte = data[0];
	if ((simulated || connected) && data[0] != 0x00) {
		var expectedByteCount = expectedByteCounts[firstByte & 0xF0];
		if (expectedByteCount && expectedByteCount<data.length) {
			data = data.slice(0, expectedByteCount)
		}
		var msg=new Uint8Array(data);
		if (!midiServer.sendMidiData(msg)) {
			if (transientActive) {
				const currTime = new Date().getTime();
				playMidiData.lastTimeoutReset = playMidiData.lastTimeoutReset || currTime;
				if (currTime-playMidiData.lastTimeoutReset>500) {
					stopTransient();
					playMidiData.lastTimeoutReset = currTime;
				}
			}
			midiOut.send(msg);
		}
		return true;
	} else {
		return false;
	}
}

terminal.onTerminalReady = function() {
  // Create a new terminal IO object and give it the foreground.
  // (The default IO object just prints warning messages about unhandled
  // things to the the JS console.)
  const io = terminal.io.push();

  processInput = send_command;
  io.onVTKeystroke = processInput;

  io.sendString = processInput;

  io.onTerminalResize = (columns, rows) => {
    // React to size changes here.
    // Secure Shell pokes at NaCl, which eventually results in
    // some ioctls on the host.
  };

  // You can call io.push() to foreground a fresh io context, which can
  // be uses to give control of the terminal to something else.  When that
  // thing is complete, should call io.pop() to restore control to the
  // previous io object.
};

function disconnected_cb(){
	terminal.io.println('\r\nDisconnected');
}

function disconnected_cb_tel(){
	chrome.sockets.tcp.close(socket,function clb(){});
	terminal.io.println('\r\nDisconnected');
}

function disconnected_cb_midi(){
	chrome.sockets.tcp.close(socket_midi,function clb(){});
}

function error(info){
	terminal.io.println(info.error);
	//disconnect();
}


function clear(){
	terminal.io.print('\033[2J\033[0;0H');
	send_command('cls\r');

}



function redrawInfo(){

  //var ctx = waveCanvas.getContext('2d');
  var x_res = waveCanvas.width;
  var y_res = waveCanvas.height;
  var line_height = 32;
  var trigger_symbol = "";
  ctx.clearRect(x_res - info_space, 0, x_res, y_res - meas_space);
  ctx.font = "12px Arial";
  ctx.textAlign = "left";
  var tterm_length = scope.length;
  for (var i = 0; i < tterm_length; i++){
    if (scope[i].name){
      ctx.fillStyle = wavecolor[i];
      if(i == scope.trigger){
        trigger_symbol = "->";
      }
      ctx.fillText(trigger_symbol + "w" + i + ": " + scope[i].name,x_res - info_space + 4, line_height * (i+1));
	  ctx.fillText(scope[i].count_div +' '+ scope[i].unit +'/div',x_res - info_space + 4, (line_height * (i+1))+16);
      trigger_symbol = "";
    }
  }
}

function redrawTop(){
	var x_res = waveCanvas.width;
	var y_res = waveCanvas.height;
	ctx.clearRect(TRIGGER_SPACE, 0, x_res - info_space, top_space);

	ctx.font = "12px Arial";
	ctx.textAlign = "left";
	ctx.fillStyle = "white";

	ctx.fillText("MIDI-File: " + midi_state.file + ' State: ' + midi_state.state + ' ' + midi_state.progress + '% / 100%'  ,TRIGGER_SPACE, 12);
 
  
}

//Part of redrawMeas,
function drawGaugeLabels() {

	var text_pos = TRIGGER_SPACE+180;
	for(i=0;i<NUM_GAUGES;i++){
		if (scope[i].name){
			ctx.fillStyle = wavecolor[i];
			ctx.fillText("Min: " +meas[i].min ,text_pos+=60, y_res - meas_position);
			ctx.fillText("Max: " +meas[i].max ,text_pos+=60, y_res - meas_position);
			ctx.fillText("Avg: "+meas[i].avg ,text_pos+=60, y_res - meas_position);
		}
	}
}

function readmidi(file){

	var fs = new FileReader();
	fs.readAsArrayBuffer(file);
	fs.onload = event_read_midi;
	
}

function event_read_midi(progressEvent){

	Player.loadArrayBuffer(progressEvent.srcElement.result);

}



function loadMidiFile(file) {
	w2ui['toolbar'].get('mnu_midi').text = 'MIDI-File: '+file.name;
	w2ui['toolbar'].refresh();
	midi_state.file = file.name;
	readmidi(file);
}

function loadSIDFile(file) {
	w2ui['toolbar'].get('mnu_midi').text = 'SID-File: '+file.name;
	w2ui['toolbar'].refresh();
	midi_state.file = file.name;
	readSID(file);
}

function readSID(file){
	var fs = new FileReader();
	fs.readAsArrayBuffer(file);
	fs.onload = event_read_SID;
}
var sid_file_marked;
var sid_state=0;
function event_read_SID(progressEvent){
	var cnt=0;
	var sid_file = new Uint8Array(progressEvent.srcElement.result.byteLength + ((progressEvent.srcElement.result.byteLength/25)*4));
	var source_cnt=0;
	var file = new Uint8Array(progressEvent.srcElement.result)
	sid_file[cnt++] = 0xFF;
	sid_file[cnt++] = 0xFF;
	sid_file[cnt++] = 0xFF;
	sid_file[cnt++] = 0xFF;
	
	
	while(source_cnt<file.byteLength){
		sid_file[cnt++]=file[source_cnt++];
		if(!(source_cnt%25)){
			sid_file[cnt++] = 0xFF;
			sid_file[cnt++] = 0xFF;
			sid_file[cnt++] = 0xFF;
			sid_file[cnt++] = 0xFF;
		}
	}
	sid_file_marked=sid_file;
	sid_state=1;
	
}

function ondrop(e){
   e.stopPropagation();
   e.preventDefault();
   if(e.dataTransfer.items.length == 1){//only one file
		sid_state=0;
   		const file = e.dataTransfer.files[0];
		const extension = file.name.substring(file.name.lastIndexOf(".")+1);
		if (extension==="mid"){
			loadMidiFile(file);
		} else if (extension=="js") {
			scripting.loadScript(file.path)
				.then((script)=> {
					currentScript = script;
					w2ui['toolbar'].get('mnu_script').text = 'Script: '+file.name;
					w2ui['toolbar'].refresh();
				})
				.catch((err)=>{
					terminal.io.println("Failed to load script: "+err);
					console.log(err);
				});
		}else if (extension=="dmp") {
			loadSIDFile(file);
		}
   }
}

function ondragover(e){
   e.stopPropagation();
   e.preventDefault();
   e.dataTransfer.dropEffect = 'copy';
}



var selectMidiIn = null;
var selectMidiOut = null;
var midiAccess = null;
var midiIn = {cancel: (reason)=>{}, isActive: ()=>false, source: ""};
var midiOut = {send: (data)=>{}, dest: ""};

function onSelectMidiIn(ev ) {
  const selected = selectMidiIn.selectedIndex;
  var id = selectMidiIn[selected].value;
  if (id!=midiIn.source) {
	  if (midiIn.isActive())
		midiIn.cancel(null);

	  selectMidiIn.selectedIndex = selected;
	  if (id=="<Network>") {
		midiServer.requestName()
			.then(()=>term_ui.inputIpAddress("Please enter the remote IP address", "MIDI over IP", true, true))
			.then(enterFilterForMidi)
			.catch((err)=>{
				console.log("Caught something!", err);
				setMidiInAsNone();
			});
	  } else if (id) {
		var midiSource;
		if ((typeof(midiAccess.inputs) == "function"))   //Old Skool MIDI inputs() code
		  midiSource = midiAccess.inputs()[id];
		else
		  midiSource = midiAccess.inputs.get(id);
		setMidiInToPort(midiSource);
	  } else {
		setMidiInAsNone();
	  }
  }
}

function setMidiInAsNone() {
	if (midiIn.isActive()) {
		midiIn.cancel(null);
	}
	midiIn = {
		isActive: () => false,
		cancel: (arg) => setMidiInAsNone(),
		data: null,
		source: ""
	};
	selectMidiIn.selectedIndex = 0;
	populateMIDISelects();
}

function setMidiInToPort(source) {
	source.onmidimessage = midiMessageReceived;
	var canceled = false;
	midiIn = {
		cancel: (arg) => {
			source.onmidimessage = null;
			canceled = true;
			setMidiInAsNone();
		},
		isActive: () => (!canceled && source.state != "disconnected"),
		source: source.id,
		data: null
	};
	populateMIDISelects();
}


function enterFilterForMidi(result) {
	term_ui.inputStrings("Please enter the filters", "MIDI filters", (channel, note)=>{
		const filterChannel = helper.parseFilter(channel);
		if (filterChannel==null) {
			return 0;
		}
		const filterNote = helper.parseFilter(note);
		if (filterNote==null) {
			return 1;
		}
		return -1;
	}, ["Channel", "Note"])
		.then(filter=>setMidiInToNetwork(result.ip, result.port, {channel: filter[0], note: filter[1]}));
}

function setMidiInToNetwork(ip, port, filter) {
	terminal.io.println("Connecting to MIDI server at "+ip+":"+port+"...");
	chrome.sockets.tcp.create({}, function(createInfo) {
		chrome.sockets.tcp.connect(createInfo.socketId,
			ip, port, s=>onMidiNetworkConnect(s, ip, port, createInfo.socketId, filter));
	});
}

function onMidiNetworkConnect(status, ip, port, socketId, filter) {
	var error = "Connection to MIDI server at "+ip+":"+port+" failed!";
	if (status>=0) {
		var connectListener = (info)=>{
			if (info.socketId != socketId)
				return;
			// info.data is an arrayBuffer.
			var name = helper.convertArrayBufferToString(info.data);
			chrome.sockets.tcp.onReceive.removeListener(connectListener);
			const data = name+";"+JSON.stringify(filter);
			chrome.sockets.tcp.send(socketId, helper.convertStringToArrayBuffer(data), s=>{
				if (s<0) {
					terminal.io.println(error);
					setMidiInAsNone();
				} else {
					terminal.io.println("Connected to MIDI server \""+name+"\" at "+ip+":"+port);
					var canceled = false;
					midiIn = {
						cancel: (reason) => {
							canceled = true;
							setMidiInAsNone();
							ontimeUI.setRelativeAllowed(true);
							if (reason) {
								terminal.io.println("Disconnected from MIDI server. Reason: " + reason);
							} else {
								chrome.sockets.tcp.send(socketId, helper.convertStringToArrayBuffer("C"),
									s=>chrome.sockets.tcp.close(socketId));
								terminal.io.println("Disconnected from MIDI server");
							}
						},
						isActive: () => !canceled,
						source: "<Network>",
						remote: name + " at " + ip + ":" + port,
						data: socketId
					};
					populateMIDISelects();
					ontimeUI.setRelativeAllowed(false);
				}
			});
		};
		chrome.sockets.tcp.onReceive.addListener(connectListener);
	} else {
		terminal.io.println(error);
		setMidiInAsNone();
	}
}

function onMIDIoverIP(info) {
	if (!midiIn.isActive() || info.socketId != midiIn.data)
		return;
	var data = new Uint8Array(info.data);
	let param = helper.convertArrayBufferToString(info.data).substring(1);
	switch (data[0]) {
		case 'M'.charCodeAt(0):
			playMidiData(data.slice(1, data.length));
			break;
		case 'C'.charCodeAt(0):
			midiIn.cancel(param);
			break;
		case 'L'.charCodeAt(0):
			midiServer.loopTest(param);
			break;
		case 'O'.charCodeAt(0):
			setRelativeOntime(data[1]);
			break;
	}
}

function onSelectMidiOut(ev) {
	const selected = selectMidiOut.selectedIndex;
	var id = selectMidiOut[selected].value;
	if (id!=midiOut.dest) {
		stopMidiOutput();
		if (id == "<Network>") {
			midiOut = {
				send: (data) => chrome.sockets.tcp.send(socket_midi, data, sendmidi)
			};
		} else if (id) {
			var midiSink;
			if ((typeof(midiAccess.outputs) == "function"))   //Old Skool MIDI inputs() code
				midiSink = midiAccess.outputs()[id];
			else
				midiSink = midiAccess.outputs.get(id);
			midiOut = {
				send: (data) => midiSink.send(data)
			};
		} else {
			midiOut = {
				send: (data) => {
				}
			};
		}
		midiOut.dest = id;
	}
}

function stopMidiOutput() {
	playMidiData([0xB0,0x7B,0x00]);
	console.log(midiOut);
}

function midi_start(){
	
if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(onMIDIStarted, onMIDISystemError);
} else {
    alert("No MIDI support in your browser.");
}
	
}

function midiConnectionStateChange( e ) {
  console.log("connection: " + e.port.name + " " + e.port.connection + " " + e.port.state );
  populateMIDISelects();
}

function onMIDIStarted( midi ) {
  var preferredIndex = 0;

  midiAccess = midi;

  //document.getElementById("synthbox").className = "loaded";
  selectMidiIn=document.getElementById("midiIn");
  selectMidiIn.onchange = onSelectMidiIn;
  selectMidiOut=document.getElementById("midiOut");
  selectMidiOut.onchange = onSelectMidiOut;
  midi.onstatechange = midiConnectionStateChange;
  populateMIDISelects();
}

function onMIDISystemError( err ) {
  document.getElementById("synthbox").className = "error";
  console.log( "MIDI not initialized - error encountered:" + err.code );
}


function populateMIDISelects() {
	// clear the MIDI input select
	selectMidiIn.options.length = 0;

	addElementKeepingSelected("None", "", midiIn.source, selectMidiIn);
	let networkText = "Network";
	const networkId = "<Network>";
	if (midiIn.source==networkId) {
		networkText = midiIn.remote;
	}
	addElementKeepingSelected(networkText, networkId, midiIn.source, selectMidiIn);
	for (let input of midiAccess.inputs.values()) {
		var str = input.name.toString();
		var preferred = !midiIn.isActive() && ((str.indexOf("Tesla") != -1) || (str.toLowerCase().indexOf("keyboard") != -1));
		if (str.includes("nano")) {
			nano = input;
			nano.onmidimessage = midiMessageReceived;
		}
		addElementKeepingSelected(input.name, input.id, midiIn.source, selectMidiIn, preferred)
	}
	onSelectMidiIn(null);
	selectMidiOut.options.length = 0;
	addElementKeepingSelected("None", "", midiOut.dest, selectMidiOut);
	if (connected==1) {
		addElementKeepingSelected("UD3 over Ethernet", "<Network>", midiOut.dest, selectMidiOut);
	}
	for (let output of midiAccess.outputs.values()) {
		var str = output.name.toString();
		if (str.includes("nano")) {
			nano_out = output;
			nano_startup();
		} else {
			addElementKeepingSelected(str, output.id, midiOut.dest, selectMidiOut, str.indexOf("UD3")>=0);
		}
	}
	onSelectMidiOut(null);
}

function addElementKeepingSelected(name, id, oldId, selector, forceSelect = false) {
	var preferred = forceSelect || id == oldId;
	selector.appendChild(new Option(name, id, preferred, preferred));
}



function midiMessageReceived( ev ) {
	if(!ev.currentTarget.name.includes("nano")){
		playMidiData(ev.data);
	} else {
		var cmd = ev.data[0] >> 4;
		var channel = ev.data[0] & 0xf;
		var noteNumber = ev.data[1];
		var velocity = ev.data[2];
			//console.log(ev);
		if (channel == 9)
			return

		if ( cmd==8 || ((cmd==9)&&(velocity==0)) ) { // with MIDI, note on with velocity zero is the same as note off
			// note off
			//noteOff( noteNumber );
			
		} else if (cmd == 9) {
		// note on
		//noteOn( noteNumber, velocity/127.0);


		switch(String(noteNumber)){
			case simpleIni.nano.play:
				nano_led(simpleIni.nano.play,1);
				nano_led(simpleIni.nano.stop,0);
				Player.play();
				midi_state.state = 'playing';
				redrawTop();
			break;
			case simpleIni.nano.stop:
				stopMidiFile();
			break;
			case simpleIni.nano.killset:
				coil_hot_led=0;
				nano_led(simpleIni.nano.killset,1);
				nano_led(simpleIni.nano.killreset,0);
				send_command('kill set\r');
			break;
			case simpleIni.nano.killreset:
				coil_hot_led=1;
				nano_led(simpleIni.nano.killset,0);
				nano_led(simpleIni.nano.killreset,1);
				send_command('kill reset\r');
			break;
		}
		console.log(noteNumber);
		} else if (cmd == 11) {
		//controller( noteNumber, velocity/127.0);
		switch(String(noteNumber)){
			case simpleIni.nano.slider0:
				setAbsoluteOntime(maxOntime*velocity/127.0);
			break;
			case simpleIni.nano.slider1:
				setBPS(maxBPS*velocity/127.0);
			break;
			case simpleIni.nano.slider2:
				setBurstOntime(maxBurstOntime*velocity/127.0);
			break;
			case simpleIni.nano.slider3:
				setBurstOfftime(maxBurstOfftime*velocity/127.0);
			break;
		}
		
		} else if (cmd == 14) {
		// pitch wheel
		//pitchWheel( ((velocity * 128.0 + noteNumber)-8192)/8192.0 );
		} else if ( cmd == 10 ) {  // poly aftertouch
		//polyPressure(noteNumber,velocity/127)
		} else{
			console.log( "" + ev.data[0] + " " + ev.data[1] + " " + ev.data[2])
		}
	}
}

function stopTransient() {
	send_command('tr stop\r');
}

function startTransient() {
	ontimeChanged();
	send_command('tr start\r');
}



// Allow multiple windows to be opened
nw.App.on('open', function(args) {
	var new_win = nw.Window.open('index.html', nw.App.manifest.window);
});
