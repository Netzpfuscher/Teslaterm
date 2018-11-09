import {CONTROL_SPACE, INFO_SPACE, MEAS_SPACE, redrawMeas, TOP_SPACE, TRIGGER_SPACE,} from "./gui";

const wavecanvas = <HTMLCanvasElement>document.getElementById("wavecanvas");
const backcanvas = <HTMLCanvasElement>document.getElementById("backcanvas");
const waveContext:CanvasRenderingContext2D = wavecanvas.getContext('2d');
const backContext:CanvasRenderingContext2D = backcanvas.getContext('2d');

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
    stats: TraceStats;//TODO type
    value_real: number;
    wavecolor: string;
    value: number;
    yPos: number;
    name: string;
    //TODO is this a good place? is there a cleaner way to do this?
    span: number;
    offset: number;

    update(): void {
        this.stats.update(this.value_real);
    }

    plot(): void {
        const y_res:number = wavecanvas.height-MEAS_SPACE-TOP_SPACE;
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
    }
}
//TODO better name
export class Oscilloscope {
    trigger: number;
    trigger_lvl: number;
    trigger_block: boolean;
    trigger_trgt: boolean;
    trigger_old: boolean;
    traces: Trace[];
    xPos: number = TRIGGER_SPACE+1;
    pixelRatio:number = 1;

    plot(): void {

        const x_res = wavecanvas.width-INFO_SPACE;
        const y_res = wavecanvas.height-MEAS_SPACE-TOP_SPACE;

        waveContext.clearRect(this.xPos, TOP_SPACE, this.pixelRatio, y_res);

        for(var i = 0; i<scope.traces.length; i++){
            //Meas
            scope.traces[i].plot();
        }

        this.xPos+=this.pixelRatio;
        if(this.xPos>=x_res){
            calc_meas();
            scope.trigger_trgt=false;
            scope.trigger_block=false;
            redrawMeas();
            this.xPos = TRIGGER_SPACE+1;

        }
    }

    onResize(): void {
        this.xPos = TRIGGER_SPACE+1;
        wavecanvas.style.width=(90-CONTROL_SPACE)+'%';
        wavecanvas.style.height='100%';
        wavecanvas.width  = wavecanvas.offsetWidth;
        wavecanvas.height = wavecanvas.offsetHeight;
        backcanvas.style.width=(90-CONTROL_SPACE)+'%';
        backcanvas.style.height='100%';
        backcanvas.width  = wavecanvas.offsetWidth;
        backcanvas.height = wavecanvas.offsetHeight;
        //HiDPI display support
        if(window.devicePixelRatio){
            this.pixelRatio = window.devicePixelRatio;
            var height = wavecanvas.getAttribute('height');
            var width = wavecanvas.getAttribute('width');
            // reset the canvas width and height with window.devicePixelRatio applied
            wavecanvas.setAttribute('width', Math.round(width * window.devicePixelRatio));
            wavecanvas.setAttribute('height', Math.round( height * window.devicePixelRatio));
            backcanvas.setAttribute('width', Math.round(width * window.devicePixelRatio));
            backcanvas.setAttribute('height', Math.round( height * window.devicePixelRatio));
            // force the canvas back to the original size using css
            wavecanvas.style.width = width+"px";
            wavecanvas.style.height = height+"px";
            backcanvas.style.width = width+"px";
            backcanvas.style.height = height+"px";
        }
        if(draw_mode!=1){
            draw_grid();
            redrawTrigger();
            redrawMeas();
        }
    }

    addValue(chart_num: number, val: number): void {
        this.traces[chart_num].addValue(val);
    }
}

export let scope:Oscilloscope = new Oscilloscope();