import {terminal} from "./gui";
import {busActive, busControllable, ConnectionState, transientActive} from "../network/telemetry";
import * as commands from '../network/commands';
import * as connection from '../network/connection';
import * as helper from '../helper';
import * as sliders from './sliders';
import * as scripting from '../scripting';
import * as midiServer from '../midi/midi_server';
import * as ui_helper from './ui_helper';
import {
    byt,
    kill_msg,
    media_state,
    MediaFileType,
    midiOut,
    PlayerState,
    setFrameCount,
    setSendingSID,
    startCurrentMidiFile,
    stopMidiFile
} from "../midi/midi";
import {redrawMidiInfo} from "./oscilloscope";

export function onConnected() {
    terminal.io.println("connected");
    w2ui['toolbar'].get('connect').text = 'Disconnect';
    w2ui['toolbar'].refresh();
}


export function onDisconnect() {
    w2ui['toolbar'].get('connect').text = 'Connect';
    w2ui['toolbar'].refresh();
}

let currentScript: Promise<any>[] = null;

export function setScript(script: Promise<any>[]) {
    currentScript = script;
}

export function onCtrlMenuClick(event) {
    switch (event.target) {

        case 'connect':
            connect();
            break;
        case 'cls':
            commands.clear();
            break;
        case 'mnu_command:bus':
            if (busActive) {
                commands.busOff();
            } else {
                helper.warn('WARNING!<br>The coil will be energized.', commands.busOn);
            }
            break;
        case 'mnu_command:transient':
            commands.setTransientEnabled(!transientActive);
            break;
        case 'mnu_command:settings':
            commands.sendCommand('config_get\r');
            break;
        case 'mnu_command:startStopMidi':
            if (midiServer.active) {
                midiServer.close();
            } else {
                midiServer.requestName()
                    .then(() =>
                        ui_helper.inputIpAddress("Please enter the port for the local MIDI server", "MIDI over IP Server",
                            false, true, null, midiServer.port)
                    ).then(port=> {
                    midiServer.setPort(port);
                    midiServer.start();
                });
            }
            break;
        case 'mnu_command:Load EEPROM-Config':
            helper.warn('WARNING!<br>Are you sure to load the configuration from EEPROM?',
                commands.eepromSave);
            break;
        case 'mnu_command:Save EEPROM-Config':
            helper.warn('WARNING!<br>Are you sure to save the configuration to EEPROM?',
                commands.eepromSave);
            break;
        case 'mnu_midi:Play':
            if (media_state.currentFile==null){
                terminal.io.println("Please select a media file using drag&drop");
                break;
            }
            if (media_state.state!=PlayerState.idle){
                terminal.io.println("A media file is currently playing, stop it before starting it again");
                break;
            }
            if (media_state.type==MediaFileType.midi) {
                startCurrentMidiFile();
            }
            media_state.state = PlayerState.playing;
            break;
        case 'mnu_midi:Stop':
            midiOut.send(kill_msg);
            if (media_state.currentFile==null || media_state.state!=PlayerState.playing){
                terminal.io.println("No media file is currently playing");
                break;
            }
            if(media_state.type==MediaFileType.sid_dmp){
                setFrameCount(byt);
                setSendingSID(true);
            } else if (media_state.type==MediaFileType.midi) {
                stopMidiFile();
            }
            media_state.state = PlayerState.idle;
            redrawMidiInfo();
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
            commands.setKill();
            break;
        case 'kill_reset':
            commands.resetKill();
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