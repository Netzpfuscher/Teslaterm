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