import {JustGage} from "justgage";
import {terminal} from "./gui";

export class Meter {
    meter_buf_old: number;
    meter_buf: number;
    gauges: JustGage;

    constructor(id:number){
            this.meter_buf_old=255;
            this.meter_buf=0;
            this.gauges= new JustGage({
                id: ("gauge"+id),
                value: 255,
                min: 0,
                max: 255,
                title: ("Gauge"+id)
            });
    }

    refresh(){
        if(this.meter_buf!=this.meter_buf_old){
            this.gauges.refresh(this.meter_buf);
            this.meter_buf_old=this.meter_buf;
        }
    }

    value(num, value){
        this.meter_buf[num] = value;
    }

    text(num,text){
        this.gauges[num].refreshTitle(text);
    }

    range(num, min, max){
        this.gauges[num].refresh(min,max);
    }
}

export const NUM_GAUGES = 7;


let meters:Meter[] = [];
for (let i = 0;i<NUM_GAUGES;++i) {
    meters[i] = new Meter(i);
}

export function refresh_all(){
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