import {TTConfig} from "../common/TTConfig";
import * as connection from "./connection/connection";
import {FileUploadIPC} from "./ipc/FileUpload";
import {MenuIPC} from "./ipc/Menu";
import {MetersIPC} from "./ipc/meters";
import {MiscIPC} from "./ipc/Misc";
import {ScopeIPC} from "./ipc/Scope";
import {Sliders} from "./ipc/sliders";
import {TerminalIPC} from "./ipc/terminal";
import * as sid from "./sid/sid";
import {loadConfig} from "./TTConfigLoader";

export let config: TTConfig;
export const simulated = true;

//TODO multi-window support?
export function init() {
    config = loadConfig("config.ini");
    Sliders.init();
    MiscIPC.init();
    FileUploadIPC.init();
    MenuIPC.init();
    TerminalIPC.init();
    ScopeIPC.init();
    MetersIPC.init();
    setInterval(tick, 20);
}

function tick() {
    sid.update();
    const updateButton = connection.update();
    if (updateButton) {
        MenuIPC.setConnectionButtonText(connection.connectionState.getButtonText());
    }
}
