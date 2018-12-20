import {config} from "./init";

var nano=null;
let nano_out=null;
let coilHot: boolean = false;

export function setNanoOut(newOut) {
    nano_out = newOut;
}

export function setNano(newNano) {
    nano = newNano;
}

export function setCoilHot(hot: boolean) {
    coilHot = hot;
}

export function setLedState(num,val){
    var uint8 = new Uint8Array(3);
    if(nano_out != null){
        if(val>0){
            uint8[0]=157;
            uint8[1]=num;
            uint8[2]=127;
            nano_out.send(uint8);
        }else{
            uint8[0]=141;
            uint8[1]=num;
            uint8[2]=0;
            nano_out.send(uint8);
        }
    }
}

export function init(){
    setLedState(config.nano.killset,1);
    setLedState(config.nano.killreset,0);

    setLedState(config.nano.play,0);
    setLedState(config.nano.stop,1);

}