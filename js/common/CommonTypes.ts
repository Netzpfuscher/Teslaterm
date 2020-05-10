import {setIPC} from "./IPCProvider";

export const enum MediaFileType {
    none,
    midi,
    sid_dmp,
    sid_emulated,
}

export enum SynthType {
    NONE = 0x04,
    MIDI = 0x03,
    SID = 0x02,
}

export const enum PlayerActivity {
    playing,
    idle,
}
