var nano=null;
var nano_out=null;

function nano_led(num,val){
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

function nano_startup(){
    nano_led(simpleIni.nano.killset,1);
    nano_led(simpleIni.nano.killreset,0);

    nano_led(simpleIni.nano.play,0);
    nano_led(simpleIni.nano.stop,1);

}