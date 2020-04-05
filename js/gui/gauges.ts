import 'justgage';
import {terminal} from "./gui";

export class Meter {
    meter_buf_old: number;
    meter_buf: number;
    gauge: JustGage;

    constructor(id:number){
            this.meter_buf_old=255;
            this.meter_buf=0;
            // @ts-ignore TODO figure out how to properly fix this
            this.gauge= new JustGage({
                id: ("gauge"+id),
                value: 0,
                min: 0,
                max: 255,
                title: ("Gauge"+id)
            });
    }

    refresh(): void {
        if(this.meter_buf!=this.meter_buf_old){
            this.gauge.refresh(this.meter_buf);
            this.meter_buf_old=this.meter_buf;
        }
    }

    value(value: number): void {
        this.meter_buf = value;
    }

    text(text: string): void {
        this.gauge.txtLabel.attr({"text": text});
    }

    range(min: number, max: number){
        //TODO does this work?
        this.gauge.refresh(min,max);
    }
}

export const NUM_GAUGES = 7;


export let meters:Meter[] = [];
export function init(): void {
    for (let i = 0; i < NUM_GAUGES; ++i) {
        meters[i] = new Meter(i);
    }
}

export function refresh_all(): void {
    for(var i=0;i<this.num_meters;i++){
        meters[i].refresh();
    }
}

export function getMeter(id:number): Meter {
    if (id>=NUM_GAUGES || id<0) {
        terminal.io.println("Meter "+id+" not found");
        return undefined;
    }
    return meters[id];
}
