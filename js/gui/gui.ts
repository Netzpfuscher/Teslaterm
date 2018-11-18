//TODO why is this broken?
import {JustGage} from '../../justgage';
import * as telemetry from '../network/telemetry';

//TODO move to a separate file?
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
export let terminal: any = new hterm.Terminal();//TODO proper type

export const MEAS_SPACE = 20;
export const INFO_SPACE = 150;
export const TOP_SPACE = 20;
export const TRIGGER_SPACE = 10;
export const CONTROL_SPACE = 15;
export const MEAS_POSITION = 4;