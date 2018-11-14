//TODO why is this broken?
import {JustGage} from '../justgage';
import * as telemetry from './telemetry';

export function onConnected() {
    terminal.io.println("connected");
    w2ui['toolbar'].get('connect').text = 'Disconnect';
    w2ui['toolbar'].refresh();
}


export function onDisconnect() {
    w2ui['toolbar'].get('connect').text = 'Connect';
    w2ui['toolbar'].refresh();
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

export function onCtrlMenuClick(event) {
    switch (event.target) {

        case 'connect':
            //TODO address parameter
            telemetry.connect();

            break;
        case 'cls':
            clear();
            break;
        case 'mnu_command:bus':
            if (busActive) {
                send_command('bus off\r');
            } else {
                warn_energ();
            }
            break;
        case 'mnu_command:transient':
            if (transientActive) {
                stopTransient();
            } else {
                startTransient();
            }
            break;
        case 'mnu_command:startStopMidi':
            if (midiServer.active) {
                midiServer.close();
            } else {
                midiServer.requestName()
                    .then(() =>
                        term_ui.inputIpAddress("Please enter the port for the local MIDI server", "MIDI over IP Server",
                            false, true, null, midiServer.port)
                    ).then(port=> {
                    midiServer.setPort(port);
                    midiServer.start();
                });
            }
            break;
        case 'mnu_command:Load EEPROM-Config':
            warn_eeprom_load();
            break;
        case 'mnu_command:Save EEPROM-Config':
            warn_eeprom_save();
            break;
        case 'mnu_midi:Play':
            if (midi_state.file==null){
                terminal.io.println("Please select a MIDI file using drag&drop");
                break;
            }
            startCurrentMidiFile();
            if(sid_state==1){
                sid_state=2;
            }
            break;
        case 'mnu_midi:Stop':
            midiOut.send(kill_msg);
            if (midi_state.file==null || midi_state.state!='playing'){
                terminal.io.println("No MIDI file is currently playing");
                break;
            }
            stopMidiFile();
            if(sid_state==2){
                sid_state=1;
                frame_cnt=byt;
                frame_cnt_old=0;
            }
            break;
        case 'mnu_script:Start':
            if (currentScript==null) {
                terminal.io.println("Please select a script file using drag&drop first");
                break;
            }
            scripting.startScript(currentScript);
            break;
        case 'mnu_script:Stop':
            if (currentScript==null) {
                terminal.io.println("Please select a script file using drag&drop first");
                break;
            }
            if (!scripting.isRunning()) {
                terminal.io.println("The script can not be stopped since it isn't running");
                break;
            }
            scripting.cancel();
            break;
        case 'kill_set':
            send_command('kill set\r');
            break;
        case 'kill_reset':
            send_command('kill reset\r');
            break;
    }
}

function connect(){
    var port = w2ui['toolbar'].get('port');
    if(connected){
        send_command('tterm stop\rcls\r');
        setTimeout(()=>{
            connection.disconnect();
        }, 200);
    }else{

        if(String(port.value).includes(".")){
            ipaddr=String(port.value);
            terminal.io.println("\r\nConnect: "+ ipaddr);
            connect_ip();

        }else{
            terminal.io.println("\r\nConnect: Serial");
            chrome.serial.getDevices(getdevs);
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