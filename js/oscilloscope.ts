import {CONTROL_SPACE, INFO_SPACE, MEAS_POSITION, MEAS_SPACE, redrawMeas, TOP_SPACE, TRIGGER_SPACE,} from "./gui";

const waveCanvas = <HTMLCanvasElement>document.getElementById("waveCanvas");
const backCanvas = <HTMLCanvasElement>document.getElementById("backCanvas");
const waveContext:CanvasRenderingContext2D = waveCanvas.getContext('2d');
const backContext:CanvasRenderingContext2D = backCanvas.getContext('2d');

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

    plot(): void {
        const y_res:number = waveCanvas.height-MEAS_SPACE-TOP_SPACE;
        const newYPos:number = (this.value * -1 + 1) * (y_res / 2.0);
        if (this.yPos && (this.yPos != (y_res / 2.0) || this.value)) {
            waveContext.lineWidth = scope.pixelRatio;
            waveContext.strokeStyle = this.wavecolor;
            waveContext.beginPath();
            waveContext.moveTo(scope.xPos, this.yPos + TOP_SPACE);
            waveContext.lineTo(scope.xPos + scope.pixelRatio, newYPos + TOP_SPACE);
            waveContext.stroke();
        }
        this.yPos = newYPos;
    }

    addValue(val: number): void {
        this.value_real = val;
        this.value=(1/this.span) *(val-this.offset);
        if(this.value > 1) this.value = 1;
        if(this.value < -1) this.value = -1;
        this.stats.update(this.value_real);
    }
}

export class Oscilloscope {
    trigger: number;
    trigger_lvl: number;
    trigger_block: boolean;
    trigger_trgt: boolean;
    trigger_old: boolean;
    traces: Trace[];
    xPos: number = TRIGGER_SPACE + 1;
    pixelRatio: number = 1;
    cleared: boolean = false;//Before: draw_mode
    static readonly gridResolution = 50;

    plot(): void {

        const x_res = waveCanvas.width - INFO_SPACE;
        const y_res = waveCanvas.height - MEAS_SPACE - TOP_SPACE;

        waveContext.clearRect(this.xPos, TOP_SPACE, this.pixelRatio, y_res);

        for (let i:number = 0; i < scope.traces.length; i++) {
            //Meas
            scope.traces[i].plot();
        }

        this.xPos += this.pixelRatio;
        if (this.xPos >= x_res) {
            scope.trigger_trgt = false;
            scope.trigger_block = false;
            redrawMeas();
            this.xPos = TRIGGER_SPACE + 1;
        }
        this.cleared = false;
    }

    //TODO also redraw gauge labels on resize!
    onResize(): void {
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

    addValue(chart_num: number, val: number): void {
        this.traces[chart_num].addValue(val);
    }

    drawLabels() {

        const x_res = waveCanvas.width;
        const y_res = waveCanvas.height;
        waveContext.clearRect(TRIGGER_SPACE, y_res - MEAS_SPACE, x_res - INFO_SPACE, y_res);

        waveContext.font = "12px Arial";
        waveContext.textAlign = "left";
        waveContext.fillStyle = "white";
        if (this.trigger != -1) {
            waveContext.fillText("Trg lvl: " + this.trigger_lvl, TRIGGER_SPACE, y_res - MEAS_POSITION);
            let state:string;
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

    draw_grid() {
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
        for (let i:number = TRIGGER_SPACE + Oscilloscope.gridResolution; i < x_res; i = i + Oscilloscope.gridResolution) {
            backContext.moveTo(i, TOP_SPACE);
            backContext.lineTo(i, y_res + TOP_SPACE);
        }

        for (let i:number = (y_res / 2) + (y_res / 10); i < y_res; i = i + (y_res / 10)) {
            backContext.moveTo(TRIGGER_SPACE, i + TOP_SPACE);
            backContext.lineTo(x_res, i + TOP_SPACE);
            backContext.moveTo(TRIGGER_SPACE, y_res - i + TOP_SPACE);
            backContext.lineTo(x_res, y_res - i + TOP_SPACE);
        }

        backContext.stroke();
    }

    drawTrigger() {
        const y_res = waveCanvas.height - MEAS_SPACE - TOP_SPACE;
        const ytrgpos = Math.floor((scope.trigger_lvl * -1 + 1) * (y_res / 2.0)) + TOP_SPACE;
        waveContext.clearRect(0, 0, 10, waveCanvas.height);
        if (scope.trigger != -1) {
            scope.trigger_block = true;
            waveContext.beginPath();
            waveContext.lineWidth = this.pixelRatio;
            waveContext.strokeStyle = this.traces[scope.trigger].wavecolor;
            waveContext.moveTo(0, ytrgpos);
            waveContext.lineTo(10, ytrgpos);
            waveContext.moveTo(10, ytrgpos);
            if (scope.trigger_lvl > 0) {
                waveContext.lineTo(5, ytrgpos - 2);
            } else {
                waveContext.lineTo(5, ytrgpos + 2);
            }
            waveContext.stroke();
            waveContext.font = "12px Arial";
            waveContext.textAlign = "center";
            waveContext.fillStyle = this.traces[scope.trigger].wavecolor;
            if (ytrgpos < 14) {
                waveContext.fillText(scope.trigger.toString(), 4, ytrgpos + 12);
            } else {
                waveContext.fillText(scope.trigger.toString(), 4, ytrgpos - 4);
            }
        }
    }
}

export let scope:Oscilloscope = new Oscilloscope();