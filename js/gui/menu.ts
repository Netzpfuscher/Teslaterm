import * as helper from "../helper";
import * as media_player from "../media/media_player";
import * as midiServer from "../midi/midi_server";
import * as commands from "../connection/commands";
import * as connection from "../connection/connection";
import {busActive, busControllable, transientActive} from "../connection/telemetry";
import * as scripting from "../scripting";
import {connection_type, openUI} from "./ConnectionUI";
import {terminal} from "./constants";
import * as sliders from "./sliders";
import * as ui_helper from "./ui_helper";

export function init() {
    const port = $("#toolbar #tb_toolbar_item_port");
    port.on("keypress", (e) => {
        console.log(e);
        if (e.originalEvent.key === "Enter") {
            w2ui.toolbar.set("port", {value: this.value});
            w2ui.toolbar.refresh();
            w2ui.toolbar.click("connect");
        }
    });
}

let currentScript: Array<() => Promise<any>> = null;

export function setScript(script: Array<() => Promise<any>>) {
    currentScript = script;
}

export function onCtrlMenuClick(event) {
    switch (event.target) {
        case "connect":
            connect();
            break;
        case "cls":
            commands.clear();
            break;
        case "mnu_command:bus":
            if (busActive) {
                commands.busOff();
            } else {
                helper.warn("WARNING!<br>The coil will be energized.", commands.busOn);
            }
            break;
        case "mnu_command:transient":
            commands.setTransientEnabled(!transientActive);
            break;
        case "mnu_command:settings":
            commands.sendCommand("config_get\r");
            break;
        case "mnu_command:startStopMidi":
            if (midiServer.active) {
                midiServer.close();
            } else {
                midiServer.requestName()
                    .then(() =>
                        ui_helper.inputPort("Please enter the port for the local MIDI server", "MIDI over IP Server",
                            midiServer.port),
                    ).then((port) => {
                    midiServer.setPort(port);
                    midiServer.start();
                });
            }
            break;
        case "mnu_command:Load EEPROM-Config":
            helper.warn("WARNING!<br>Are you sure to load the configuration from EEPROM?",
                commands.eepromSave);
            break;
        case "mnu_command:Save EEPROM-Config":
            helper.warn("WARNING!<br>Are you sure to save the configuration to EEPROM?",
                commands.eepromSave);
            break;
        case "mnu_midi:Play":
            media_player.media_state.startPlaying();
            break;
        case "mnu_midi:Stop":
            media_player.media_state.stopPlaying();
            break;
        case "mnu_script:Start":
            if (currentScript === null) {
                terminal.io.println("Please select a script file using drag&drop first");
                break;
            }
            scripting.startScript(currentScript);
            break;
        case "mnu_script:Stop":
            if (currentScript === null) {
                terminal.io.println("Please select a script file using drag&drop first");
                break;
            }
            if (!scripting.isRunning()) {
                terminal.io.println("The script can not be stopped since it isn't running");
                break;
            }
            scripting.cancel();
            break;
        case "kill_set":
            commands.setKill();
            break;
        case "kill_reset":
            commands.resetKill();
            break;
    }
}


async function connect() {
    connection.pressButton();
}

export function updateBusActive() {
    if (busControllable) {
        helper.changeMenuEntry("mnu_command", "bus", "Bus " + (busActive ? "OFF" : "ON"));
    }
    sliders.updateSliderAvailability();
}

export function updateTransientActive() {
    helper.changeMenuEntry("mnu_command", "transient", "TR " + (transientActive ? "Stop" : "Start"));
    sliders.updateSliderAvailability();
}

export function updateBusControllable() {
    if (busControllable) {
        helper.addFirstMenuEntry("mnu_command", "bus", "Bus " + (busActive ? "OFF" : "ON"), "fa fa-bolt");
    } else {
        helper.removeMenuEntry("mnu_command", "bus");
    }

    sliders.updateSliderAvailability();
}

export function updateConnectionButton(buttonText: string) {
    const button = w2ui.toolbar.get("connect");
    button.text = buttonText;
    w2ui.toolbar.refresh();
}

