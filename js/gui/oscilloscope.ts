import {CONTROL_SPACE, INFO_SPACE, MEAS_POSITION, MEAS_SPACE, TOP_SPACE, TRIGGER_SPACE,} from "./gui";
import {NUM_GAUGES} from "./gauges";
import {media_state} from "../midi/midi";
import {MediaFileType, PlayerActivity} from "../media/media_player";

let waveCanvas: HTMLCanvasElement;
let backCanvas: HTMLCanvasElement;
let waveContext: CanvasRenderingContext2D;
let backContext: CanvasRenderingContext2D;

export class TraceStats {
    min: number = 0;
    max: number = 1024;
    minDisplay: string = '';
    maxDisplay: string = '';
    avgDisplay: string = '';
    squareSum: number = 0;
    samples: number = 0;


    update(value_real: number): void {
        if (value_real < this.min) this.min = value_real;
        if (value_real > this.max) this.max = value_real;
        this.squareSum += (value_real * value_real);
        this.samples++;
        this.minDisplay = this.min.toFixed(2);
        this.maxDisplay = this.max.toFixed(2);
        this.avgDisplay = Math.sqrt(this.squareSum / this.samples).toFixed(2);
    }
}
export class Trace {
    stats: TraceStats = new TraceStats();
    value_real: number = 0;
    wavecolor: string = 'red';
    value: number = 0;
    yPos: number = 0;
    name: string = '';
    //TODO is this a good place? is there a cleaner way to do this?
    span: number = 2048;
    offset: number = 1024;
    unit: string = '';
    perDiv: number = 1;

    constructor(color: string) {
        this.wavecolor = color;
    }

    plot(): void {
        const y_res: number = waveCanvas.height - MEAS_SPACE - TOP_SPACE;
        const newYPos: number = (this.value * -1 + 1) * (y_res / 2.0);
        if (this.yPos && (this.yPos != (y_res / 2.0) || this.value)) {
            waveContext.lineWidth = pixelRatio;
            waveContext.strokeStyle = this.wavecolor;
            waveContext.beginPath();
            waveContext.moveTo(xPos, this.yPos + TOP_SPACE);
            waveContext.lineTo(xPos + pixelRatio, newYPos + TOP_SPACE);
            waveContext.stroke();
        }
        this.yPos = newYPos;
    }

    addValue(val: number): void {
        this.value_real = val;
        this.value = (1 / this.span) * (val - this.offset);
        if (this.value > 1) this.value = 1;
        if (this.value < -1) this.value = -1;
        this.stats.update(this.value_real);
    }
}

let trigger_id: number = -1;

let trigger_lvl: number = 0;

let trigger_lvl_real: number = 0;
let trigger_block: boolean = false;
let trigger_trgt: boolean = false;
let trigger_old: boolean = false;
export let traces: Trace[] = [];
let xPos: number = TRIGGER_SPACE + 1;
let pixelRatio: number = 1;
enum DrawMode {
    standard = 0,
    controlled = 1
}

let drawMode: DrawMode = DrawMode.controlled;

const gridResolution = 50;
const wavecolors: string[] = ["white", "red", "blue", "green", "rgb(255, 128, 0)", "rgb(128, 128, 64)", "rgb(128, 64, 128)", "rgb(64, 128, 128)", "DimGray"];
export function plotTraces(): void {

    const x_res = waveCanvas.width - INFO_SPACE;
    const y_res = waveCanvas.height - MEAS_SPACE - TOP_SPACE;

    waveContext.clearRect(xPos, TOP_SPACE, pixelRatio, y_res);

    for (let i: number = 0; i < traces.length; i++) {
        //Meas
        traces[i].plot();
    }

    xPos += pixelRatio;
    if (xPos >= x_res) {
        trigger_trgt = false;
        trigger_block = false;
        redrawMeas();
        xPos = TRIGGER_SPACE + 1;
    }
    drawMode = DrawMode.standard;
}
//TODO also redraw gauge labels on resize!
export function onResize(): void {
    xPos = TRIGGER_SPACE + 1;
    waveCanvas.style.width = (90 - CONTROL_SPACE) + '%';
    waveCanvas.style.height = '100%';
    waveCanvas.width = waveCanvas.offsetWidth;
    waveCanvas.height = waveCanvas.offsetHeight;
    backCanvas.style.width = (90 - CONTROL_SPACE) + '%';
    backCanvas.style.height = '100%';
    backCanvas.width = waveCanvas.offsetWidth;
    backCanvas.height = waveCanvas.offsetHeight;
    //HiDPI display support
    if (window.devicePixelRatio) {
        pixelRatio = window.devicePixelRatio;
        const height: number = Number(waveCanvas.getAttribute('height'));
        const width: number = Number(waveCanvas.getAttribute('width'));
        // reset the canvas width and height with window.devicePixelRatio applied
        waveCanvas.setAttribute('width', Math.round(width * window.devicePixelRatio).toString());
        waveCanvas.setAttribute('height', Math.round(height * window.devicePixelRatio).toString());
        backCanvas.setAttribute('width', Math.round(width * window.devicePixelRatio).toString());
        backCanvas.setAttribute('height', Math.round(height * window.devicePixelRatio).toString());
        // force the canvas back to the original size using css
        waveCanvas.style.width = width + "px";
        waveCanvas.style.height = height + "px";
        backCanvas.style.width = width + "px";
        backCanvas.style.height = height + "px";
    }
    if (drawMode==DrawMode.standard) {
        draw_grid();
        redrawTrigger();
        drawTriggerStatus();
        redrawInfo();
    }
}

export function addValue(chart_num: number, val: number): void {
    traces[chart_num].addValue(val);
}

export function init(): void {
    waveCanvas = <HTMLCanvasElement>document.getElementById("waveCanvas");
    backCanvas = <HTMLCanvasElement>document.getElementById("backCanvas");
    waveContext = waveCanvas.getContext('2d');
    backContext = backCanvas.getContext('2d');
    waveCanvas.onmousedown = onMouseDown;


    for(let i=0;i<NUM_GAUGES;i++){
        traces.push(new Trace(wavecolors[i]));
    }
}

export function drawTriggerStatus(): void {
    const y_res = waveCanvas.height;
    waveContext.font = "12px Arial";
    waveContext.textAlign = "left";
    waveContext.fillStyle = "white";
    if (trigger_id != -1) {
        waveContext.fillText("Trg lvl: " + trigger_lvl.toFixed(2), TRIGGER_SPACE, y_res - MEAS_POSITION);
        let state: string;
        if (trigger_trgt) {
            state = 'Trg...';
        } else {
            state = 'Wait...';
        }
        waveContext.fillText("Trg state: " + state, TRIGGER_SPACE + 100, y_res - MEAS_POSITION);
    } else {
        waveContext.fillText("Trg lvl: off", TRIGGER_SPACE, y_res - MEAS_POSITION);
    }

}

export function draw_grid() {
    const x_res = waveCanvas.width - INFO_SPACE;
    const y_res = waveCanvas.height - MEAS_SPACE - TOP_SPACE;

    backContext.beginPath();
    backContext.strokeStyle = "yellow";
    backContext.lineWidth = pixelRatio;

    backContext.moveTo(TRIGGER_SPACE, Math.floor(y_res / 2) + TOP_SPACE);
    backContext.lineTo(x_res, Math.floor(y_res / 2) + TOP_SPACE);

    backContext.stroke();

    backContext.beginPath();
    backContext.lineWidth = pixelRatio;
    backContext.strokeStyle = "yellow";
    backContext.moveTo(TRIGGER_SPACE + 1, TOP_SPACE);
    backContext.lineTo(TRIGGER_SPACE + 1, y_res + TOP_SPACE);
    backContext.stroke();
    backContext.beginPath();
    backContext.lineWidth = pixelRatio;
    backContext.strokeStyle = "grey";
    for (let i: number = TRIGGER_SPACE + gridResolution; i < x_res; i = i + gridResolution) {
        backContext.moveTo(i, TOP_SPACE);
        backContext.lineTo(i, y_res + TOP_SPACE);
    }

    for (let i: number = (y_res / 2) + (y_res / 10); i < y_res; i = i + (y_res / 10)) {
        backContext.moveTo(TRIGGER_SPACE, i + TOP_SPACE);
        backContext.lineTo(x_res, i + TOP_SPACE);
        backContext.moveTo(TRIGGER_SPACE, y_res - i + TOP_SPACE);
        backContext.lineTo(x_res, y_res - i + TOP_SPACE);
    }

    backContext.stroke();
}

export function redrawTrigger() {
    const y_res = waveCanvas.height - MEAS_SPACE - TOP_SPACE;
    const y_trigger_position = Math.floor((trigger_lvl * -1 + 1) * (y_res / 2.0)) + TOP_SPACE;
    waveContext.clearRect(0, 0, TRIGGER_SPACE, waveCanvas.height);
    if (trigger_id != -1) {
        trigger_block = true;
        //Arrow
        waveContext.beginPath();
        waveContext.lineWidth = pixelRatio;
        waveContext.strokeStyle = traces[trigger_id].wavecolor;
        waveContext.moveTo(0, y_trigger_position);
        waveContext.lineTo(10, y_trigger_position);
        waveContext.moveTo(10, y_trigger_position);
        if (trigger_lvl > 0) {
            waveContext.lineTo(5, y_trigger_position - 2);
        } else {
            waveContext.lineTo(5, y_trigger_position + 2);
        }
        waveContext.stroke();
        //Text
        waveContext.font = "12px Arial";
        waveContext.textAlign = "center";
        waveContext.fillStyle = traces[trigger_id].wavecolor;
        if (y_trigger_position < 14) {
            waveContext.fillText(trigger_id.toString(), 4, y_trigger_position + 12);
        } else {
            waveContext.fillText(trigger_id.toString(), 4, y_trigger_position - 4);
        }
    }
}

export function drawLine(x1: number, x2: number, y1: number, y2: number, color: number) {
    waveContext.beginPath();
    waveContext.lineWidth = pixelRatio;
    waveContext.strokeStyle = wavecolors[color];
    waveContext.moveTo(x1, y1);
    waveContext.lineTo(x2, y2);
    waveContext.stroke();
}

export function clear() {
    backContext.clearRect(0, 0, backCanvas.width, backCanvas.height);
    waveContext.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
    xPos = TRIGGER_SPACE+1;
}


export function beginControlledDraw() {
    clear();
    drawMode = DrawMode.controlled;
}

function beginStandardDraw() {
    clear();
    draw_grid();
    redrawTrigger();
    redrawMeas();
    redrawInfo();

    drawMode = DrawMode.standard;
}

export function drawString(x: number, y: number, color: number, size: number, str: string, center: boolean) {
    waveContext.font = size + "px Arial";
    waveContext.textAlign = "left";
    waveContext.fillStyle = wavecolors[color];
    if (center) {
        waveContext.fillText(str,x, y);
    } else {
        waveContext.fillText(str, x, y);
    }
}

export function drawChart(): void {
    if(drawMode==DrawMode.controlled){
        beginStandardDraw();
    }
    if(trigger_id==-1){
        plotTraces();
    }else{
        const triggered = (trigger_lvl>0)==(traces[trigger_id].value > trigger_lvl);
        if (trigger_block === false) {
            if (xPos == 11 && triggered) {
                trigger_block = true;
            }
        } else {
            if (trigger_trgt || triggered) {
                trigger_trgt = true;
                plotTraces();
            }
            if (trigger_trgt != trigger_old) redrawMeas();
            trigger_old = trigger_trgt;

        }

    }
}

export function redrawInfo(){
    const x_res = waveCanvas.width;
    const y_res = waveCanvas.height;
    const line_height = 32;
    let trigger_symbol = "";
    waveContext.clearRect(x_res - INFO_SPACE, 0, x_res, y_res - MEAS_SPACE);
    waveContext.font = "12px Arial";
    waveContext.textAlign = "left";
    const tterm_length = traces.length;
    for (let i = 0; i < tterm_length; i++){
        if (traces[i].name){
            waveContext.fillStyle = wavecolors[i];
            if(i == trigger_id){
                trigger_symbol = "->";
            }
            waveContext.fillText(trigger_symbol + "w" + i + ": " + traces[i].name,x_res - INFO_SPACE + 4, line_height * (i+1));
            waveContext.fillText(traces[i].perDiv +' '+ traces[i].unit +'/div',x_res - INFO_SPACE + 4, (line_height * (i+1))+16);
            trigger_symbol = "";
        }
    }
    redrawMeas();
}

function redrawMeas(){
    const x_res = waveCanvas.width;
    const y_res = waveCanvas.height;
    waveContext.clearRect(TRIGGER_SPACE, y_res - MEAS_SPACE, x_res - INFO_SPACE - TRIGGER_SPACE, y_res);
    drawTriggerStatus();
    let text_pos = TRIGGER_SPACE+180;
    for(let i=0;i<traces.length;i++){
        if (traces[i].name){
            waveContext.fillStyle = wavecolors[i];
            waveContext.fillText("Min: " +traces[i].stats.min ,text_pos+=60, y_res - MEAS_POSITION);
            waveContext.fillText("Max: " +traces[i].stats.max ,text_pos+=60, y_res - MEAS_POSITION);
            waveContext.fillText("Avg: "+traces[i].stats.avgDisplay ,text_pos+=60, y_res - MEAS_POSITION);
        }
    }
}

export function setTrigger(triggerId: number) {
    trigger_id = triggerId;
    trigger_trgt = false;
    beginStandardDraw();
}


function onMouseDown(e){
    let pos_y = e.y - 51;
    const y_res = waveCanvas.height-MEAS_SPACE-TOP_SPACE;
    if((pos_y>=TOP_SPACE && pos_y<=waveCanvas.height-MEAS_SPACE) && trigger_id!=-1){
        pos_y-=TOP_SPACE;
        trigger_lvl=(2/y_res)*((y_res/2)-pos_y);
        trigger_lvl_real=trigger_lvl*traces[trigger_id].span;
        redrawMeas();
        redrawTrigger();
    }
}

export function redrawMediaInfo(){
    const x_res = waveCanvas.width;
    waveContext.clearRect(TRIGGER_SPACE, 0, x_res - INFO_SPACE, TOP_SPACE);

    waveContext.font = "12px Arial";
    waveContext.textAlign = "left";
    waveContext.fillStyle = "white";

    if (media_state.type!=MediaFileType.none) {
        let output: string = "MIDI";
        if (media_state.type==MediaFileType.sid_dmp) {
            output = "SID-DMP";
        } else if (media_state.type==MediaFileType.sid_emulated) {
            output = "SID";
        }
        output += "-File: " + media_state.title + ' State: ';
        if (media_state.state==PlayerActivity.playing) {
            //TODO support for undefined length (real SID)?
            output += "playing " + media_state.progress + '% / 100%'
        } else {
            output += "idle";
        }
        waveContext.fillText(output, TRIGGER_SPACE, 12);
    }
}
