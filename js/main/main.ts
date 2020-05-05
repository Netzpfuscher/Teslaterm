import {app, BrowserWindow} from "electron";
import * as path from "path";
import {TTConfig} from "../common/TTConfig";
import * as connection from "./connection/connection";
import {Menu} from "./ipc/Menu";
import {Misc} from "./ipc/Misc";
import {Sliders} from "./ipc/sliders";
import * as midi from "./midi/midi";
import * as sid from "./sid/sid";
import {loadConfig} from "./TTConfigLoader";

export let mainWindow: BrowserWindow;
export let config: TTConfig;
export const simulated = true;

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        webPreferences: {
            // TODO the goal is for this to be removed at some point
            nodeIntegration: true
        }
    });

    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, "../../index.html"));

    // Open the DevTools.
    mainWindow.webContents.openDevTools();

    mainWindow.setMenuBarVisibility(false);

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
    config = loadConfig("config.ini");
    initAll();
    setInterval(tick, 20);
}

//TODO multi-window support?
function initAll() {
    Sliders.init();
    midi.init();
    connection.autoConnect();
    Misc.init();
    //TODO is this too early?
    Misc.syncTTConfig(config);
}

//TODO make everything tick individually?
function tick() {
    sid.update();
    const updateButton = connection.update();
    if (updateButton) {
        Menu.setConnectionButtonText(connection.connectionState.getButtonText());
    }
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    // On OS X it"s common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});
