import {terminal} from "../gui/constants";
import * as sliders from "../gui/sliders";
import {media_state, MediaFileType} from "../media/media_player";
import {connection} from "./connection";
import {SynthType} from "./IUD3Connection";

export const maxOntime = 400;
export const maxBPS = 1000;
export const maxBurstOntime = 1000;
export const maxBurstOfftime = 1000;

export async function sendCommand(command: string) {
    await connection.sendTelnet(new Buffer(command));
}

export async function clear() {
    // \033=\u1B
    terminal.io.print('\u001B[2J\u001B[0;0H');
    await sendCommand('cls\r');
}

export async function stop() {
    await sendCommand('tterm stop\rcls\r');
}


export async function reconnect() {
    await sendCommand('tterm start\r');
}


export async function startConf() {
    await sendCommand('\r');
    sliders.ontime.setToZero();
    await sendCommand('set pw 0\r');
    await setBPS(sliders.getBPS());
    await setBurstOntime(sliders.getBurstOntime());
    await setBurstOfftime(sliders.getBurstOfftime());
    await setSynth(media_state.type);
    await sendCommand('kill reset\rtterm start\rcls\r');
}

export async function busOff() {
    await sendCommand('bus off\r');
}

export async function busOn() {
    await sendCommand('bus on\r');
}

export async function eepromSave() {
    await sendCommand('eeprom save\r');
}

export async function eepromLoad() {
    await sendCommand('eeprom load\r');
}

export async function setKill() {
    await sendCommand('kill set\r');
}

export async function resetKill() {
    await sendCommand('kill reset\r');
}

export async function setOntime(ontime: number) {
    await sendCommand('set pw ' + ontime + '\r');
}

export async function setBurstOntime(ontime: number) {
    await sendCommand('set bon ' + ontime + '\r');
}

export async function setBurstOfftime(offtime: number) {
    await sendCommand('set boff ' + offtime + '\r');
}

export async function setOfftime(offtime: number) {
    await sendCommand('set pwd ' + offtime + '\r');
}

export async function setBPS(bps: number) {
    const pwd = Math.floor(1000000 / bps);
    await setOfftime(Number(pwd));
}

export async function setParam(param: string, value: string) {
    await sendCommand('set ' + param + ' ' + value + '\r');
}

export async function setSynth(type: MediaFileType) {
    let ud3Type: SynthType;
    switch (type) {
        case MediaFileType.none:
            ud3Type = SynthType.NONE;
            break;
        case MediaFileType.midi:
            ud3Type = SynthType.MIDI;
            break;
        case MediaFileType.sid_dmp:
        case MediaFileType.sid_emulated:
            ud3Type = SynthType.SID;
            break;
    }
    await connection.setSynth(ud3Type);
}

export async function setTransientEnabled(enable: boolean) {
    await sendCommand('tr ' + (enable ? 'start' : 'stop') + '\r');
}

