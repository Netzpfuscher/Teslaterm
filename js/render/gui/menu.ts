import {UD3State} from "../../common/IPCConstantsToRenderer";
import {commands} from "../ipc/commands";
import {MenuIPC} from "../ipc/Menu";
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

export function onCtrlMenuClick(event) {
    switch (event.target) {
        case "connect":
            MenuIPC.connectButton();
            break;
        case "cls":
            commands.clear();
            break;
        case "mnu_command:bus":
            if (ud3State.busActive) {
                commands.busOff();
            } else {
                ui_helper.warn("WARNING!<br>The coil will be energized.", () => commands.busOn());
            }
            break;
        case "mnu_command:transient":
            commands.setTransientEnabled(!ud3State.transientActive);
            break;
        case "mnu_command:settings":
            commands.sendCommand("config_get\r");
            break;
        case "mnu_command:Load EEPROM-Config":
            ui_helper.warn("WARNING!<br>Are you sure to load the configuration from EEPROM?",
                commands.eepromSave);
            break;
        case "mnu_command:Save EEPROM-Config":
            ui_helper.warn("WARNING!<br>Are you sure to save the configuration to EEPROM?",
                commands.eepromSave);
            break;
        case "mnu_midi:Play":
            MenuIPC.startPlaying();
            break;
        case "mnu_midi:Stop":
            MenuIPC.stopPlaying();
            break;
        case "mnu_script:Start":
            MenuIPC.startScript();
            break;
        case "mnu_script:Stop":
            MenuIPC.startScript();
            break;
        case "kill_set":
            commands.setKill();
            break;
        case "kill_reset":
            commands.resetKill();
            break;
    }
}

let ud3State: UD3State = new UD3State(false, false, false);

export function updateUD3State(newState: UD3State) {
    if (newState.transientActive != ud3State.transientActive) {
        ui_helper.changeMenuEntry("mnu_command", "transient", "TR " + (newState.transientActive ? "Stop" : "Start"));
    }

    if (newState.busControllable && !ud3State.busControllable) {
        ui_helper.addFirstMenuEntry("mnu_command", "bus", "Bus " + (newState.busActive ? "OFF" : "ON"), "fa fa-bolt");
    } else if (!newState.busControllable && ud3State.busControllable) {
        ui_helper.removeMenuEntry("mnu_command", "bus");
    } else if (newState.busActive != ud3State.busActive) {
        ui_helper.changeMenuEntry("mnu_command", "bus", "Bus " + (newState.busActive ? "OFF" : "ON"));
    }

    sliders.updateSliderAvailability(newState);
    ud3State = newState;
}

export function updateConnectionButton(buttonText: string) {
    const button = w2ui.toolbar.get("connect");
    button.text = buttonText;
    w2ui.toolbar.refresh();
}
