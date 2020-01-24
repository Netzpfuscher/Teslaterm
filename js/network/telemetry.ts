import {terminal} from '../gui/gui';
import {meters} from '../gui/gauges';
import * as scope from '../gui/oscilloscope'
import {bytes_to_signed, convertArrayBufferToString} from '../helper';
import * as sid from "../sid/sid";
import {mainSocket, socket_midi, resetTimeout} from "./connection";
import * as menu from '../gui/menu'
import {config} from '../init';
import * as commands from '../network/commands';
import * as $ from 'jquery'

export const enum ConnectionState {
    UNCONNECTED = 0,
    CONNECTED_SERIAL = 2,
    CONNECTED_IP = 1
}


export let busActive: boolean = false;
export let busControllable: boolean = false;
export let transientActive: boolean = false;


const TT_GAUGE = 1;

const TT_GAUGE_CONF = 2;
const TT_CHART = 3;
const TT_CHART_DRAW = 4;
const TT_CHART_CONF = 5;
const TT_CHART_CLEAR = 6;
const TT_CHART_LINE = 7;
const TT_CHART_TEXT = 8;
const TT_CHART_TEXT_CENTER = 9;
const TT_STATE_SYNC = 10;
const TT_CONFIG_GET = 11;
const UNITS: string[] = ['', 'V', 'A', 'W', 'Hz', '°C'];

const TYPE_UNSIGNED = 0;
const TYPE_SIGNED = 1;
const TYPE_FLOAT = 2;
const TYPE_CHAR = 3;
const TYPE_STRING = 4;

const TT_STATE_IDLE = 0;


const TT_STATE_FRAME = 1;
const TT_STATE_COLLECT = 3;
const DATA_TYPE = 0;

const DATA_LEN = 1;
const DATA_NUM = 2;
let term_state:number=0;

let udconfig=[];

function compute(dat: number[]){
    let str:string;
    switch(dat[DATA_TYPE]){
        case TT_GAUGE:
            meters[dat[DATA_NUM]].value(bytes_to_signed(dat[3],dat[4]));
            break;
        case TT_GAUGE_CONF:
            const index = dat[DATA_NUM];
            const gauge_min = bytes_to_signed(dat[3],dat[4]);
            const gauge_max = bytes_to_signed(dat[5],dat[6]);
            dat.splice(0,7);
            str = convertArrayBufferToString(dat);
            meters[index].text(str);
            meters[index].range(gauge_min, gauge_max);
            break;
        case TT_CHART_CONF:
            let chart_num = dat[2].valueOf();
            const min = bytes_to_signed(dat[3],dat[4]);
            const max = bytes_to_signed(dat[5],dat[6]);
            scope.traces[chart_num].span= max-min;
            scope.traces[chart_num].perDiv=scope.traces[chart_num].span/5;
            scope.traces[chart_num].offset = bytes_to_signed(dat[7],dat[8]);
            scope.traces[chart_num].unit = UNITS[dat[9]];
            dat.splice(0,10);
            scope.traces[chart_num].name = convertArrayBufferToString(dat);
            scope.redrawInfo();
            break;
        case TT_CHART:
            const val=bytes_to_signed(dat[3],dat[4]);
            chart_num= dat[DATA_NUM].valueOf();
            scope.addValue(chart_num, val);
            break;
        case TT_CHART_DRAW:
            scope.drawChart();
            break;
        case TT_CHART_CLEAR:
            scope.beginControlledDraw();
            break;
        case TT_CHART_LINE:
            const x1 = bytes_to_signed(dat[2],dat[3]);
            const y1 = bytes_to_signed(dat[4],dat[5]);
            const x2 = bytes_to_signed(dat[6],dat[7]);
            const y2 = bytes_to_signed(dat[8],dat[9]);
            const color = dat[10].valueOf();
            scope.drawLine(x1, x2, y1, y2, color);

            break;
        case TT_CHART_TEXT:
            drawString(dat, false);
            break;
        case TT_CHART_TEXT_CENTER:
            drawString(dat, true);
            break;
        case TT_STATE_SYNC:
            setBusActive((dat[2]&1)!=0);
            setTransientActive((dat[2]&2)!=0);
            setBusControllable((dat[2]&4)!=0);
            break;
        case TT_CONFIG_GET:
            dat.splice(0,2);
            str = convertArrayBufferToString(dat,false);
            if(str == "NULL;NULL"){
                ud_settings(udconfig);
                udconfig=[];
            }else{
                let substrings = str.split(";")
                udconfig.push(substrings);
            }
            break;
    }
}

function setBusActive(active) {
    if (active!=busActive) {
        busActive = active;
        menu.updateBusActive();
    }
}

function setTransientActive(active) {
    if (active!=transientActive) {
        transientActive = active;
        menu.updateTransientActive();
    }
}

function setBusControllable(controllable) {
    if (controllable!=busControllable) {
        busControllable = controllable;
        menu.updateBusControllable();
    }
}

function drawString(dat: number[], center: boolean) {
    const x = bytes_to_signed(dat[2],dat[3]);
    const y = bytes_to_signed(dat[4],dat[5]);
    const color = dat[6].valueOf();
    let size = dat[7].valueOf();
    if(size<6) size=6;
    dat.splice(0,8);
    const str = convertArrayBufferToString(dat);
    scope.drawString(x, y, color, size, str, center);
}

const TIMEOUT = 50;

let buffer: number[] = [];
let bytes_done:number = 0;

let receive_callbacks: {[socket: number]: (data: Uint8Array)=>void} = {};

export function register_callback(socket: number, callback: (data: Uint8Array)=>void) {
    console.log("Registered callback for socket " + socket);
    receive_callbacks[socket] = callback;
}

export function remove_callback(socket: number) {
    console.log("Removed callback for socket " + socket);
    receive_callbacks[socket] = undefined;
}

function receive(info){
    const buf = new Uint8Array(info.data);
    const callback = receive_callbacks[info.socketId];
    if (callback) {
        callback(buf);
    } else {
        console.log("Unhandled packet on socket "+info.socketId, buf)
    }
}

export function main_socket_receive(buf: Uint8Array) {
    resetTimeout();

    for (let i = 0; i < buf.length; i++) {
        switch(term_state){
            case TT_STATE_IDLE:
                if(buf[i]== 0xff){
                    term_state = TT_STATE_FRAME;
                }else{
                    const str = String.fromCharCode.apply(null, [buf[i]]);
                    terminal.io.print(str);
                }
                break;

            case TT_STATE_FRAME:
                buffer[DATA_LEN]=buf[i];
                bytes_done=0;
                term_state=TT_STATE_COLLECT;
                break;

            case TT_STATE_COLLECT:
                if(bytes_done==0){
                    buffer[0] = buf[i];
                    bytes_done++;
                    break;
                }else{
                    if(bytes_done<buffer[DATA_LEN]-1){
                        buffer[bytes_done+1]=buf[i];
                        bytes_done++;
                    }else{
                        buffer[bytes_done+1]=buf[i];
                        bytes_done=0;
                        term_state=TT_STATE_IDLE;
                        compute(buffer);
                        buffer=[];
                    }
                }
                break;
        }
    }
}

export function  ud_settings(uconfig) {
	let tfields = [];
	let trecords = [];
	//console.log(udconfig);
	for(let i=0;i<uconfig.length;i++){
		let data = uconfig[i];
		let inipage:string = config.get('config.'+data[0]);
		if(!inipage) inipage='0';
		switch (parseInt(data[2])){
			case TYPE_CHAR:
				tfields.push({ field: data[0], type: 'text', html: { caption: data[0],text: '<i>'+data[6]+'</i>' ,page: inipage, column: 0 } });
			break;
			case TYPE_FLOAT:
				tfields.push({ field: data[0], type: 'text', html: { caption: data[0],text: '<i>'+data[6] + '</i><br>       <b>MIN:</b> ' + data[4] + '   <b>MAX:</b> ' + data[5] ,page: inipage, column: 0 } });
			break;
			case TYPE_SIGNED:
				tfields.push({ field: data[0], type: 'text', html: { caption: data[0],text: '<i>'+data[6] + '</i><br>       <b>MIN:</b> ' + data[4] + '   <b>MAX:</b> ' + data[5] ,page: inipage, column: 0 } });
			break;
			case TYPE_STRING:
				tfields.push({ field: data[0], type: 'text', html: { caption: data[0],text: '<i>'+data[6]+'</i>' ,page: inipage, column: 0 } });
			break;
			case TYPE_UNSIGNED:
				tfields.push({ field: data[0], type: 'text', html: { caption: data[0],text: '<i>'+data[6] + '</i><br>       <b>MIN:</b> ' + data[4] + '   <b>MAX:</b> ' + data[5] ,page: inipage, column: 0 } });
			break;			
		}
	
		trecords[data[0]] = data[1];
	}	

	if (w2ui.foo) {
			w2ui.foo.original = [];
			w2ui.foo.record = [];
		for(let copy in trecords){
			w2ui.foo.original[copy] =  trecords[copy];
			w2ui.foo.record[copy] =  trecords[copy];
		}
		w2ui.foo.refresh();
	}
	
	if (!w2ui.foo) {
		$().w2form({
			name: 'foo',
			style: 'border: 0px; background-color: transparent;',
			tabs: [
			{ id: 'tab1', caption: 'General' },
			{ id: 'tab2', caption: 'Timing'},
			{ id: 'tab3', caption: 'Feedback'},
			{ id: 'tab4', caption: 'IP'},
			{ id: 'tab5', caption: 'Serial'},
			{ id: 'tab6', caption: 'Current'},
			],
			fields: tfields,
			record: trecords,
			actions: {
				"save": function () { 
					for (let changes in this.getChanges()){
						this.record[changes] = this.record[changes].replace(',','.');
						commands.setParam(changes,this.record[changes]);
						//commands.sendCommand('set ' + changes + ' ' + this.record[changes] + '\r');
						this.original[changes] = this.record[changes];
					}
					w2popup.close();
				},
				"save EEPROM": function () { 
					for (let changes in this.getChanges()){
						this.record[changes] = this.record[changes].replace(',','.');
                        commands.setParam(changes,this.record[changes]);
						this.original[changes] = this.record[changes];
					}
					commands.eepromSave();
					w2popup.close();
				}	
			}
		});
	}
	w2popup.open({
		title   : 'UD3 Settings',
		body    : '<div id="form" style="width: 100%; height: 100%;"></div>',
		style   : 'padding: 15px 0px 0px 0px',
		width   : 650,
		height  : 650, 
		showMax : true,
		onToggle: function (event) {
			$(w2ui.foo.box).hide();
			event.onComplete = function () {
				$(w2ui.foo.box).show();
				w2ui.foo.resize();
			}
		},
		onOpen: function (event) {
			event.onComplete = function () {
				// specifying an onOpen handler instead is equivalent to specifying an onBeforeOpen handler, which would make this code execute too early and hence not deliver.
                (<any>$('#w2ui-popup #form')).w2render('foo'); //TODO: Property 'w2render' does not exist on type 'JQuery<HTMLElement>'.
			}
		}
	});
}

export function init() {
    chrome.serial.onReceive.addListener(receive);
    chrome.sockets.tcp.onReceive.addListener(receive);
}