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
import {NetworkSIDServer} from "./sid/NetworkSIDServer";
import * as sid from "./sid/sid";
import * as midi from "./midi/midi";
import {loadConfig} from "./TTConfigLoader";

export let config: TTConfig;
export const simulated = false;
let sidServer: NetworkSIDServer;

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
    setInterval(tick200, 200);
    setInterval(tick20, 20);
    setInterval(tick10, 10);
    connection.autoConnect();
    if (config.netsid.enabled) {
        sidServer = new NetworkSIDServer(config.netsid.port);
    }
}

function tick200() {
    connection.updateSlow();
}

function tick20() {
    sid.update();
    midi.update();
}

function tick10() {
    const updateButton = connection.updateFast();
    if (updateButton) {
        MenuIPC.setConnectionButtonText(connection.connectionState.getButtonText());
    }
}
