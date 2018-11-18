import {terminal} from "./gui";
import {busActive, busControllable, ConnectionState, transientActive} from "../network/telemetry";
import * as cmd from '../network/commands';
import * as connection from '../network/connection';
import {w2confirm} from 'w2ui';
import * as helper from '../helper';
import * as sliders from './sliders';
import * as scripting from '../scripting'

export function onConnected() {
    terminal.io.println("connected");
    w2ui['toolbar'].get('connect').text = 'Disconnect';
    w2ui['toolbar'].refresh();
}


export function onDisconnect() {
    w2ui['toolbar'].get('connect').text = 'Connect';
    w2ui['toolbar'].refresh();
}


export function onCtrlMenuClick(event) {
    switch (event.target) {

        case 'connect':
            connect();
            break;
        case 'cls':
            cmd.clear();
            break;
        case 'mnu_command:bus':
            if (busActive) {
                cmd.busOff();
            } else {
                helper.warn('WARNING!<br>The coil will be energized.', cmd.busOn);
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
            helper.warn('WARNING!<br>Are you sure to load the configuration from EEPROM?',
                cmd.eepromSave);
            break;
        case 'mnu_command:Save EEPROM-Config':
            helper.warn('WARNING!<br>Are you sure to save the configuration to EEPROM?',
                cmd.eepromSave);
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
            cmd.resetKill();
            break;
        case 'kill_reset':
            cmd.setKill();
            break;
    }
}


function connect(){
    if(connection.connState!=ConnectionState.UNCONNECTED){
        connection.disconnect();
    }else{
        const port = w2ui['toolbar'].get('port');
        connection.connect(port.value);
    }
}

export function updateBusActive() {
    if (busControllable) {
        helper.changeMenuEntry("mnu_command", "bus", "Bus "+(busActive?"OFF":"ON"));
    }
    sliders.updateSliderAvailability();
}

export function updateTransientActive() {
    helper.changeMenuEntry("mnu_command", "transient", "TR "+(transientActive?"Stop":"Start"));
    sliders.updateSliderAvailability();
}

export function updateBusControllable() {
    if (busControllable) {
        helper.addFirstMenuEntry("mnu_command", "bus", "Bus "+(busActive?"OFF":"ON"), 'fa fa-bolt');
    } else {
        helper.removeMenuEntry("mnu_command", "bus");
    }

    sliders.updateSliderAvailability();
}