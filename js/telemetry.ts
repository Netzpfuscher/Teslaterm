import {meters, terminal} from './gui';
import * as scope from './oscilloscope'
import {bytes_to_signed, convertArrayBufferToString} from './helper';
import * as midi from "./midi";
import {mainSocket, socket_midi} from "./connection";

export enum ConnectionState {
    UNCONNECTED,
    CONNECTED_SERIAL,
    CONNECTED_IP
}

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

const UNITS: string[] = ['', 'V', 'A', 'W', 'Hz', '°C'];


const TT_STATE_IDLE = 0;
const TT_STATE_FRAME = 1;
const TT_STATE_COLLECT = 3;

const DATA_TYPE = 0;
const DATA_LEN = 1;
const DATA_NUM = 2;

let term_state:number=0;

function compute(dat: number[]){
    switch(dat[DATA_TYPE]){
        case TT_GAUGE:
            meters.value(dat[DATA_NUM], bytes_to_signed(dat[3],dat[4]));
            break;
        case TT_GAUGE_CONF:
            const gauge_num = dat[2].valueOf();
            const gauge_min = bytes_to_signed(dat[3],dat[4]);
            const gauge_max = bytes_to_signed(dat[5],dat[6]);
            dat.splice(0,7);
            const str = convertArrayBufferToString(dat);
            meters.text(gauge_num, str);
            meters.range(gauge_num, gauge_min, gauge_max);
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
            scope.plot();
            break;
        case TT_CHART_CLEAR:
            scope.clear();
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
let response_timeout: number = TIMEOUT;

function receive(info){

    if(info.socketId==socket_midi){
        const buf = new Uint8Array(info.data);
        if(buf[0]==0x78){
            //TODO why doesn't this work
            midi.setFlowCtl(false);
        }
        if(buf[0]==0x6f){
            midi.setFlowCtl(true);
        }
    }

    if (info.socketId!=mainSocket) {
        return;
    }

    const buf = new Uint8Array(info.data);

    response_timeout = TIMEOUT;

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
                        buffer[bytes_done+1]=buf[i]
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