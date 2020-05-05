import "justgage";
import {terminal} from "./constants";

export class Meter {
    private meter_buf_old: number;
    private meter_buf: number;
    private gauge: JustGage;

    constructor(id: number) {
        this.meter_buf_old = 255;
        this.meter_buf = 0;
        this.gauge = new JustGage({
            id: ("gauge" + id),
            value: 0,
            // tslint:disable-next-line:object-literal-sort-keys
            min: 0,
            max: 255,
            title: ("Gauge" + id),
        });
    }

    public refresh(): void {
        if (this.meter_buf !== this.meter_buf_old) {
            this.gauge.refresh(this.meter_buf);
            this.meter_buf_old = this.meter_buf;
        }
    }

    public value(value: number): void {
        this.meter_buf = value;
    }

    public text(new_text: string): void {
        this.gauge.txtLabel.attr({text: new_text});
    }

    public range(min: number, max: number) {
        this.gauge.refresh(min, max);
    }
}

export const NUM_GAUGES = 7;


export let meters: Meter[] = [];

export function init(): void {
    for (let i = 0; i < NUM_GAUGES; ++i) {
        meters[i] = new Meter(i);
    }
}

export function refresh_all(): void {
    for (const meter of meters) {
        meter.refresh();
    }
}

export function getMeter(id: number): Meter {
    if (id >= NUM_GAUGES || id < 0) {
        terminal.io.println("Meter " + id + " not found");
        return undefined;
    }
    return meters[id];
}
