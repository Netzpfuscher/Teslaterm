import {UD3State, IPCConstantsToRenderer} from "../../common/IPCConstantsToRenderer";
import {mainWindow} from "../main";

export class Menu {
    public static setBusState(active: boolean, controllable: boolean, transientActive: boolean) {
        mainWindow.webContents.send(IPCConstantsToRenderer.menu.busState, new UD3State(active, controllable, transientActive));
    }

    public static setConnectionButtonText(newText: string) {
        mainWindow.webContents.send(IPCConstantsToRenderer.menu.connectionButtonText, newText);
    }

    public static setScriptName(scriptName: string) {
        mainWindow.webContents.send(IPCConstantsToRenderer.menu.setScriptName, "Script: " + scriptName);
    }

    public static setMediaName(buttonText: string) {
        mainWindow.webContents.send(IPCConstantsToRenderer.menu.setMediaTitle, buttonText);
    }
}
