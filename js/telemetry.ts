import {meters, redrawMeas, redrawInfo} from './gui';
import {scope} from './oscilloscope'
import {bytes_to_signed, convertArrayBufferToString} from './helper';

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


const TT_UNIT_NONE = 0;
const TT_UNIT_V = 1;
const TT_UNIT_A = 2;
const TT_UNIT_W = 3;
const TT_UNIT_Hz = 4;
const TT_UNIT_C = 5;


const TT_STATE_IDLE = 0;
const TT_STATE_FRAME = 1;
const TT_STATE_COLLECT = 3;

let term_state:number=0;

const DATA_TYPE = 0;
const DATA_LEN = 1;
const DATA_NUM = 2;


function compute(dat: number[]){
    switch(dat[DATA_TYPE]){
        case TT_GAUGE:
            meters.value(dat[DATA_NUM], bytes_to_signed(dat[3],dat[4]));
            break;
        case TT_GAUGE_CONF:
            var gauge_num = dat[2].valueOf();
            var gauge_min = bytes_to_signed(dat[3],dat[4]);
            var gauge_max = bytes_to_signed(dat[5],dat[6]);
            dat.splice(0,7);
            var str = convertArrayBufferToString(dat);
            meters.text(gauge_num, str);
            meters.range(gauge_num, gauge_min, gauge_max);
            break;
        case TT_CHART_CONF:

            var chart_num = dat[2].valueOf();
            scope[chart_num].min = bytes_to_signed(dat[3],dat[4]);
            scope[chart_num].max = bytes_to_signed(dat[5],dat[6]);
            scope[chart_num].span=(scope[chart_num].max-scope[chart_num].min);
            scope[chart_num].count_div=scope[chart_num].span/5;
            scope[chart_num].offset = bytes_to_signed(dat[7],dat[8]);
            switch(dat[9]){
                case TT_UNIT_NONE:
                    scope[chart_num].unit = '';
                    break;
                case TT_UNIT_V:
                    scope[chart_num].unit = 'V';
                    break;
                case TT_UNIT_A:
                    scope[chart_num].unit = 'A';
                    break;
                case TT_UNIT_W:
                    scope[chart_num].unit = 'W';
                    break;
                case TT_UNIT_Hz:
                    scope[chart_num].unit = 'Hz';
                    break;
                case TT_UNIT_C:
                    scope[chart_num].unit = '°C';
                    break;
            }
            dat.splice(0,10);
            scope.traces[chart_num].name = convertArrayBufferToString(dat);
            redrawInfo();
            redrawMeas();

            break;
        case TT_CHART:
            var val=bytes_to_signed(dat[3],dat[4]);
            var chart_num= dat[DATA_NUM].valueOf();
            scope.addValue(chart_num, val);
            break;
        case TT_CHART_DRAW:
            scope.plot();
            break;
        case TT_CHART_CLEAR:
            chart_cls();
            scope.cleared = true;
            break;
        case TT_CHART_LINE:
            var x1 = bytes_to_signed(dat[2],dat[3]);
            var y1 = bytes_to_signed(dat[4],dat[5]);
            var x2 = bytes_to_signed(dat[6],dat[7]);
            var y2 = bytes_to_signed(dat[8],dat[9]);
            var color = dat[10].valueOf();
            ctx.beginPath();
            ctx.lineWidth = pixel;
            ctx.strokeStyle = wavecolor[color];
            ctx.moveTo(x1,y1);
            ctx.lineTo(x2,y2);
            ctx.stroke();

            break;
        case TT_CHART_TEXT:
            var x = bytes_to_signed(dat[2],dat[3]);
            var y = bytes_to_signed(dat[4],dat[5]);
            var color = dat[6].valueOf();
            var size = dat[7].valueOf();
            if(size<6) size=6;
            dat.splice(0,8);
            var str = convertArrayBufferToString(dat);
            ctx.font = size + "px Arial";
            ctx.textAlign = "left";
            ctx.fillStyle = wavecolor[color];
            ctx.fillText(str,x, y);
            break;
        case TT_CHART_TEXT_CENTER:
            var x = bytes_to_signed(dat[2],dat[3]);
            var y = bytes_to_signed(dat[4],dat[5]);
            var color = dat[6].valueOf();
            var size = dat[7].valueOf();
            if(size<6) size=6;
            dat.splice(0,8);
            var str = convertArrayBufferToString(dat);
            ctx.font = size + "px Arial";
            ctx.textAlign = "center";
            ctx.fillStyle = wavecolor[color];
            ctx.fillText(str,x, y);
            break;
        case TT_STATE_SYNC:
            setBusActive((dat[2]&1)!=0);
            setTransientActive((dat[2]&2)!=0);
            setBusControllable((dat[2]&4)!=0);
            break;
    }
}

function receive(info){

    if(info.socketId==socket_midi){
        var buf = new Uint8Array(info.data);
        if(buf[0]==0x78){
            flow_ctl=0;
        }
        if(buf[0]==0x6f){
            flow_ctl=1;
        }
    }

    if (info.socketId!=socket) {
        return;
    }

    var buf = new Uint8Array(info.data);
    var txt = '';

    response_timeout = TIMEOUT;
    check_cnt=0;

    for (var i = 0; i < buf.length; i++) {


        switch(term_state){
            case TT_STATE_IDLE:
                if(buf[i]== 0xff){
                    term_state = TT_STATE_FRAME;
                }else{
                    var str = String.fromCharCode.apply(null, [buf[i]]);
                    terminal.io.print(str);
                }
                break;

            case TT_STATE_FRAME:
                receive.buffer[DATA_LEN]=buf[i];
                receive.bytes_done=0;
                term_state=TT_STATE_COLLECT;
                break;

            case TT_STATE_COLLECT:

                if(receive.bytes_done==0){
                    receive.buffer[0] = buf[i];
                    receive.bytes_done++;
                    break;
                }else{

                    if(receive.bytes_done<receive.buffer[DATA_LEN]-1){
                        receive.buffer[receive.bytes_done+1]=buf[i]
                        receive.bytes_done++;
                    }else{
                        receive.buffer[receive.bytes_done+1]=buf[i];
                        receive.bytes_done=0;
                        term_state=TT_STATE_IDLE;
                        compute(receive.buffer);
                        receive.buffer=[];
                    }
                }

                break;


        }
    }
}
receive.buffer = [];
receive.bytes_done = 0;