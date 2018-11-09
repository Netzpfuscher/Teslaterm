import {CONTROL_SPACE, INFO_SPACE, MEAS_POSITION, MEAS_SPACE, redrawMeas, TOP_SPACE, TRIGGER_SPACE,} from "./gui";




const waveCanvas = <HTMLCanvasElement>document.getElementById("waveCanvas");
const backCanvas = <HTMLCanvasElement>document.getElementById("backCanvas");
const waveContext: CanvasRenderingContext2D = waveCanvas.getContext('2d');
const backContext: CanvasRenderingContext2D = backCanvas.getContext('2d');

export class TraceStats {
    min: number;
    max: number;
    minDisplay: string;
    maxDisplay: string;
    avgDisplay: string;
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
    stats: TraceStats;
    value_real: number;
    wavecolor: string;
    value: number;
    yPos: number;
    name: string;
    //TODO is this a good place? is there a cleaner way to do this?
    span: number;
    offset: number;
    unit: string;
    perDiv: number;

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

let trigger: number;
let trigger_lvl: number;
let trigger_block: boolean;
let trigger_trgt: boolean;
let trigger_old: boolean;
export let traces: Trace[];
let xPos: number = TRIGGER_SPACE + 1;
let pixelRatio: number = 1;
let cleared: boolean = false;//Before: draw_mode
const gridResolution = 50;
const wavecolor: string[] = ["white", "red", "blue", "green", "rgb(255, 128, 0)", "rgb(128, 128, 64)", "rgb(128, 64, 128)", "rgb(64, 128, 128)", "DimGray"];

export function plot(): void {

    const x_res = waveCanvas.width - INFO_SPACE;
    const y_res = waveCanvas.height - MEAS_SPACE - TOP_SPACE;

    waveContext.clearRect(this.xPos, TOP_SPACE, this.pixelRatio, y_res);

    for (let i: number = 0; i < traces.length; i++) {
        //Meas
        traces[i].plot();
    }

    this.xPos += this.pixelRatio;
    if (this.xPos >= x_res) {
        trigger_trgt = false;
        trigger_block = false;
        redrawMeas();
        this.xPos = TRIGGER_SPACE + 1;
    }
    this.cleared = false;
}

//TODO also redraw gauge labels on resize!
export function onResize(): void {
    this.xPos = TRIGGER_SPACE + 1;
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
        this.pixelRatio = window.devicePixelRatio;
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
    if (!this.cleared) {
        this.draw_grid();
        this.drawTrigger();
        this.drawLabels();
    }
}

export function addValue(chart_num: number, val: number): void {
    this.traces[chart_num].addValue(val);
}

export function drawLabels() {

    const x_res = waveCanvas.width;
    const y_res = waveCanvas.height;
    waveContext.clearRect(TRIGGER_SPACE, y_res - MEAS_SPACE, x_res - INFO_SPACE, y_res);

    waveContext.font = "12px Arial";
    waveContext.textAlign = "left";
    waveContext.fillStyle = "white";
    if (this.trigger != -1) {
        waveContext.fillText("Trg lvl: " + this.trigger_lvl, TRIGGER_SPACE, y_res - MEAS_POSITION);
        let state: string;
        if (this.trigger_trgt) {
            state = 'Trg...'
        } else {
            state = 'Wait...'
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
    backContext.lineWidth = this.pixelRatio;

    backContext.moveTo(TRIGGER_SPACE, Math.floor(y_res / 2) + TOP_SPACE);
    backContext.lineTo(x_res, Math.floor(y_res / 2) + TOP_SPACE);

    backContext.stroke();

    backContext.beginPath();
    backContext.lineWidth = this.pixelRatio;
    backContext.strokeStyle = "yellow";
    backContext.moveTo(TRIGGER_SPACE + 1, TOP_SPACE);
    backContext.lineTo(TRIGGER_SPACE + 1, y_res + TOP_SPACE);
    backContext.stroke();
    backContext.beginPath();
    backContext.lineWidth = this.pixelRatio;
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

export function drawTrigger() {
    const y_res = waveCanvas.height - MEAS_SPACE - TOP_SPACE;
    const ytrgpos = Math.floor((trigger_lvl * -1 + 1) * (y_res / 2.0)) + TOP_SPACE;
    waveContext.clearRect(0, 0, 10, waveCanvas.height);
    if (trigger != -1) {
        trigger_block = true;
        waveContext.beginPath();
        waveContext.lineWidth = this.pixelRatio;
        waveContext.strokeStyle = this.traces[trigger].wavecolor;
        waveContext.moveTo(0, ytrgpos);
        waveContext.lineTo(10, ytrgpos);
        waveContext.moveTo(10, ytrgpos);
        if (trigger_lvl > 0) {
            waveContext.lineTo(5, ytrgpos - 2);
        } else {
            waveContext.lineTo(5, ytrgpos + 2);
        }
        waveContext.stroke();
        waveContext.font = "12px Arial";
        waveContext.textAlign = "center";
        waveContext.fillStyle = this.traces[trigger].wavecolor;
        if (ytrgpos < 14) {
            waveContext.fillText(trigger.toString(), 4, ytrgpos + 12);
        } else {
            waveContext.fillText(trigger.toString(), 4, ytrgpos - 4);
        }
    }
}

export function drawLine(x1: number, x2: number, y1: number, y2: number, color: number) {
    waveContext.beginPath();
    waveContext.lineWidth = pixelRatio;
    waveContext.strokeStyle = wavecolor[color];
    waveContext.moveTo(x1, y1);
    waveContext.lineTo(x2, y2);
    waveContext.stroke();
}


export function clear() {
    cleared = true;
    backContext.clearRect(0, 0, backCanvas.width, backCanvas.height);
    waveContext.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
}

export function drawString(x: number, y: number, color: number, size: number, str: string, center: boolean) {
    waveContext.font = size + "px Arial";
    waveContext.textAlign = "left";
    waveContext.fillStyle = wavecolor[color];
    if (center) {
        waveContext.fillText(str,x, y);
    } else {
        waveContext.fillText(str, x, y);
    }
}