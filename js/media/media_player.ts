import {transientActive} from "../network/telemetry";
import * as commands from "../network/commands";

export const enum MediaFileType {
    none,
    midi,
    sid_dmp
}

export const enum PlayerActivity {
    playing,
    idle
}

export class PlayerState {
    currentFile: File;
    type: MediaFileType;
    progress: number;
    state: PlayerActivity;
}


let lastTimeoutReset:number = 0;
export function checkTransientDisabled() {
    if (transientActive) {
        const currTime = new Date().getTime();
        if (currTime-lastTimeoutReset>500) {
            commands.setTransientEnabled(false);
            lastTimeoutReset = currTime;
        }
    }
}

