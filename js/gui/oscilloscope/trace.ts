import {bytes_to_signed, convertArrayBufferToString} from "../../helper";
import {UNITS} from "../../network/constants";
import {INFO_SPACE, MEAS_POSITION, MEAS_SPACE, TOP_SPACE} from "../constants";
import {TraceStats} from "./trace_stats";

export class Trace {
    public get span() {
        return this.span_private;
    }

    public readonly wavecolor: string;
    // TODO is this a good place? is there a cleaner way to do this?
    public span_private: number = 2048;
    private stats: TraceStats = new TraceStats();
    private value_real: number = 0;
    private value: number = 0;
    private yPos: number = 0;
    private name: string = "";
    private offset: number = 1024;
    private unit: string = "";
    private perDiv: number = 1;

    constructor(color: string) {
        this.wavecolor = color;
    }

    public plot(
        waveCanvas: HTMLCanvasElement,
        waveContext: CanvasRenderingContext2D,
        xPos: number,
    ): void {
        const y_res: number = waveCanvas.height - MEAS_SPACE - TOP_SPACE;
        const newYPos: number = (this.value * -1 + 1) * (y_res / 2.0);
        if (this.yPos && (this.yPos !== (y_res / 2.0) || this.value)) {
            waveContext.lineWidth = window.devicePixelRatio;
            waveContext.strokeStyle = this.wavecolor;
            waveContext.beginPath();
            waveContext.moveTo(xPos, this.yPos + TOP_SPACE);
            waveContext.lineTo(xPos + window.devicePixelRatio, newYPos + TOP_SPACE);
            waveContext.stroke();
        }
        this.yPos = newYPos;
    }

    public addValue(val: number): void {
        this.value_real = val;
        this.value = (1 / this.span) * (val - this.offset);
        if (this.value > 1) {
            this.value = 1;
        }
        if (this.value < -1) {
            this.value = -1;
        }
        this.stats.update(this.value_real);
    }

    public drawInfo(
        waveContext: CanvasRenderingContext2D,
        this_id: number,
        trigger_id: number,
    ): void {
        const line_height = 32;
        const x_res = waveContext.canvas.width;
        if (name) {
            let trigger_symbol = "";
            waveContext.fillStyle = this.wavecolor;
            if (this_id === trigger_id) {
                trigger_symbol = "->";
            }
            waveContext.fillText(
                trigger_symbol + "w" + this_id + ": " + this.name,
                x_res - INFO_SPACE + 4,
                line_height * (this_id + 1),
            );
            waveContext.fillText(
                this.perDiv + " " + this.unit + "/div",
                x_res - INFO_SPACE + 4,
                (line_height * (this_id + 1)) + 16,
            );
            trigger_symbol = "";
        }
    }

    public drawMeasurement(
        waveContext: CanvasRenderingContext2D,
        text_pos: number,
    ): number {
        if (this.name) {
            const y_res = waveContext.canvas.height;
            waveContext.fillStyle = this.wavecolor;
            waveContext.fillText("Min: " + this.stats.get_min_str(), text_pos += 60, y_res - MEAS_POSITION);
            waveContext.fillText("Max: " + this.stats.get_max_str(), text_pos += 60, y_res - MEAS_POSITION);
            waveContext.fillText("Avg: " + this.stats.get_rms_str(), text_pos += 60, y_res - MEAS_POSITION);
        }
        return text_pos;
    }

    public is_triggered(trigger_lvl: number): boolean {
        return (trigger_lvl > 0) === (this.value > trigger_lvl);
    }

    public configure(dat: number[]) {
        const min = bytes_to_signed(dat[3], dat[4]);
        const max = bytes_to_signed(dat[5], dat[6]);
        this.span_private = max - min;
        this.perDiv = this.span / 5;
        this.offset = bytes_to_signed(dat[7], dat[8]);
        this.unit = UNITS[dat[9]];
        dat.splice(0, 10);
        this.name = convertArrayBufferToString(dat);
    }
}
