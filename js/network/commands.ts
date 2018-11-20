import {terminal} from "../gui/gui";
import {ConnectionState} from "./telemetry";
import * as helper from '../helper';
import {connid, connState, mainSocket} from "./connection";
// @ts-ignore TODO remove
import * as chrome from 'chrome';

export const maxOntime = 400;
export const maxBPS = 1000;
export const maxBurstOntime = 1000;
export const maxBurstOfftime = 1000;
function send_command(command){
    if(connState==ConnectionState.CONNECTED_SERIAL){
        chrome.serial.send(connid, helper.convertStringToArrayBuffer(command));
    }
    if(connState==ConnectionState.CONNECTED_IP){
        chrome.sockets.tcp.send(mainSocket, helper.convertStringToArrayBuffer(command));
    }
}
export function clear(){
    // \033=\u1B
    terminal.io.print('\u001B[2J\u001B[0;0H');
    send_command('cls\r');
}

export function stop() {
    send_command('tterm stop\rcls\r');
}


export function reconnect(){
    send_command('tterm start\r');
}


export function startConf(){
    send_command('\r');
    send_command('set pw 0\r');
    send_command('set pwd 50000\r');
    send_command('kill reset\rtterm start\rcls\r');

}


export function busOff() {
    send_command('bus off\r');
}

export function busOn() {
    send_command('bus on\r');
}

export function eepromSave() {
    send_command('eeprom save\r');
}

export function eepromLoad() {
    send_command('eeprom load\r');
}

export function setKill() {
    send_command('kill set\r');
}
export function resetKill() {
    send_command('kill reset\r');
}
export function setOntime(ontime: number) {
    send_command('set pw ' + ontime + '\r');
}
export function setBurstOntime(ontime: number) {
    send_command('set bon ' + ontime + '\r');
}
export function setBurstOfftime(offtime: number) {
    send_command('set boff ' + offtime + '\r');
}
export function setOfftime(number: number) {
    send_command('set pwd ' + number + '\r');
}
export function setTransientEnabled(enable: boolean) {
    send_command('tr '+enable?'on':'off');
}