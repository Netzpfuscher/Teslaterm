import {TTConfig} from "../common/TTConfig";
import * as connection from "./connection/connection";
import {FileUploadIPC} from "./ipc/FileUpload";
import {MenuIPC} from "./ipc/Menu";
import {MetersIPC} from "./ipc/meters";
import {MiscIPC} from "./ipc/Misc";
import {ScopeIPC} from "./ipc/Scope";
import {ScriptingIPC} from "./ipc/Scripting";
import {SlidersIPC} from "./ipc/sliders";
import {TerminalIPC} from "./ipc/terminal";
import * as sid from "./sid/sid";
import * as midi from "./midi/midi";
import {loadConfig} from "./TTConfigLoader";

export let config: TTConfig;
export const simulated = false;

export function init() {
    config = loadConfig("config.ini");
    SlidersIPC.init();
    MiscIPC.init();
    FileUploadIPC.init();
    MenuIPC.init();
    TerminalIPC.init();
    ScopeIPC.init();
    MetersIPC.init();
    ScriptingIPC.init();
    midi.init();
    setInterval(tick, 20);
    connection.autoConnect();
}

function tick() {
    sid.update();
    midi.update();
    const updateButton = connection.update();
    if (updateButton) {
        MenuIPC.setConnectionButtonText(connection.connectionState.getButtonText());
    }
}
