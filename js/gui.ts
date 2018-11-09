//TODO why is this broken?
import {JustGage} from '../justgage';

export class Chart {
    min: number;
    max: number;
    span:number;
    count_div: number;
    offset: number;
    unit: string;
    name: string;
    value_real: number;
    value: number;
}



export class Meter {
    num_meters: number;
    meter_buf_old: number[];
    meter_buf: number[];
    gauges: any;//TODO proper type definition

    constructor(meters){
        this.num_meters=meters;
        this.meter_buf_old = [];
        this.meter_buf = [];
        this.gauges = [];

        for(var i=0;i<this.num_meters;i++){
            this.meter_buf_old[i]=255;
            this.meter_buf[i]=0;
            this.gauges[i]= new JustGage({
                id: ("gauge"+i),
                value: 255,
                min: 0,
                max: 255,
                title: ("Gauge"+i)
            });
        }

    }

    refresh_all(){
        for(var i=0;i<this.num_meters;i++){
            this.gauges[i].refresh(this.meter_buf[i]);
        }
    }

    refresh(){
        for(var i=0;i<this.num_meters;i++){
            if(this.meter_buf[i]!=this.meter_buf_old[i]){
                this.gauges[i].refresh(this.meter_buf[i]);
                this.meter_buf_old[i]=this.meter_buf[i];
            }
        }
    }

    value(num, value){
        if(num<this.num_meters){
            this.meter_buf[num] = value;
        }else{
            console.log('Meter: '+num+'not found');
        }
    }

    text(num,text){
        if(num<this.num_meters){
            this.gauges[num].refreshTitle(text);
        }else{
            console.log('Meter: '+num+'not found');
        }
    }

    range(num, min, max){
        if(num<this.num_meters){
            this.gauges[num].refresh(min,max);
        }else{
            console.log('Meter: '+num+'not found');
        }
    }
}

export const NUM_GAUGES = 7;


export let meters:Meter = new Meter(NUM_GAUGES);
export function redrawInfo(): void {
    //TODO
}
export function redrawMeas(): void {
    //TODO
}

export const MEAS_SPACE = 20;
export const INFO_SPACE = 150;
export const TOP_SPACE = 20;
export const TRIGGER_SPACE = 10;
export const CONTROL_SPACE = 15;


export function drawChart(): void {
    if(draw_mode==1){
        chart_cls();
        draw_grid();
        redrawTrigger();
        redrawMeas();

        draw_mode=0;
    }
    if(scope.trigger==-1){
        plot();
    }else{
        var triggered = (scope.trigger_lvl>0)==(scope[scope.trigger].value > scope.trigger_lvl);
        if (scope.trigger_block === false) {
            if (plot.xpos == 11 && triggered) {
                scope.trigger_block = true;
            }
        } else {
            if (scope.trigger_trgt || triggered) {
                scope.trigger_trgt = true;
                plot();
            }
            if (scope.trigger_trgt != scope.trigger_old) redrawMeas();
            scope.trigger_old = scope.trigger_trgt;

        }

    }
}