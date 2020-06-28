import {MenuIPC} from "../../ipc/Menu";

export let busActive: boolean = false;
export let busControllable: boolean = false;
export let transientActive: boolean = false;

export function setBusActive(active) {
    if (active !== busActive) {
        busActive = active;
        MenuIPC.setUD3State(busActive, busControllable, transientActive);
    }
}

export function setTransientActive(active) {
    if (active !== transientActive) {
        transientActive = active;
        MenuIPC.setUD3State(busActive, busControllable, transientActive);
    }
}

export function setBusControllable(controllable) {
    if (controllable !== busControllable) {
        busControllable = controllable;
        MenuIPC.setUD3State(busActive, busControllable, transientActive);
    }
}
