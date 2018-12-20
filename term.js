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








function onMIDISystemError( err ) {
  document.getElementById("synthbox").className = "error";
  console.log( "MIDI not initialized - error encountered:" + err.code );
}


