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
    kill_msg,
    media_state,
    midiOut,
    startCurrentMidiFile,
    stopMidiFile
} from "../midi/midi";
import {redrawMediaInfo} from "./oscilloscope";
import * as media_player from "../media/media_player";
import {loadSidFile, setSendingSID} from "../sid/sid";

export function init() {
    const port = $('#toolbar #tb_toolbar_item_port');
    port.on("keypress", (e) => {
        console.log(e);
        if (e.originalEvent.key == "Enter") {
            w2ui.toolbar.set('port', {value: this.value});
            w2ui.toolbar.refresh();
            w2ui['toolbar'].click('connect');
        }
    });
}

export function onConnected() {
    terminal.io.println("connected");
    w2ui['toolbar'].get('connect').text = 'Disconnect';
    w2ui['toolbar'].refresh();
}

export function onDisconnect() {
    w2ui['toolbar'].get('connect').text = 'Connect';
    w2ui['toolbar'].refresh();
}

let currentScript: (() => Promise<any>)[] = null;

export function setScript(script: (() => Promise<any>)[]) {
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
                        ui_helper.inputPort("Please enter the port for the local MIDI server", "MIDI over IP Server",
                            midiServer.port)
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
            media_player.startPlaying();
            break;
        case 'mnu_midi:Stop':
            media_player.stopPlaying();
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
    if (connection.connection) {
        connection.disconnect();
    } else {
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
