import {app, BrowserWindow, ipcMain} from "electron";
import * as path from "path";
import {IPCProvider, setIPC} from "../common/IPCProvider";
import {init} from "./init";

export let mainWindow: BrowserWindow;

class ElectronIPC implements IPCProvider {
    on(channel: string, callback: (...args: any[]) => void) {
        ipcMain.on(channel, (ev, ...args) => callback(...args));
    }

    send(channel: string, ...args: any[]) {
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send(channel, ...args);
        }
    }

    once(channel: string, callback: (...args: any[]) => void) {
        ipcMain.once(channel, (ev, ...args) => callback(...args));
    }
}

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        webPreferences: {
            // TODO the goal is for this to be removed at some point
            nodeIntegration: true
        }
    });

    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, "../../index_electron.html"));

    // Open the DevTools.
    mainWindow.webContents.openDevTools();

    mainWindow.setMenuBarVisibility(false);

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
    setIPC(new ElectronIPC());
    init();
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
