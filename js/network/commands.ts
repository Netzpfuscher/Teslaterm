import {terminal} from "../gui/gui";
import {ConnectionState} from "./telemetry";
import * as helper from '../helper';
import {connid, connState, mainSocket} from "./connection";

export const maxOntime = 400;
export const maxBPS = 1000;
export const maxBurstOntime = 1000;
export const maxBurstOfftime = 1000;
export function sendCommand(command){
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
    sendCommand('cls\r');
}

export function stop() {
    sendCommand('tterm stop\rcls\r');
}


export function reconnect(){
    sendCommand('tterm start\r');
}


export function startConf(){
    sendCommand('\r');
    sendCommand('set pw 0\r');
    sendCommand('set pwd 50000\r');
    sendCommand('kill reset\rtterm start\rcls\r');

}


export function busOff() {
    sendCommand('bus off\r');
}

export function busOn() {
    sendCommand('bus on\r');
}

export function eepromSave() {
    sendCommand('eeprom save\r');
}

export function eepromLoad() {
    sendCommand('eeprom load\r');
}

export function setKill() {
    sendCommand('kill set\r');
}
export function resetKill() {
    sendCommand('kill reset\r');
}
export function setOntime(ontime: number) {
    sendCommand('set pw ' + ontime + '\r');
}
export function setBurstOntime(ontime: number) {
    sendCommand('set bon ' + ontime + '\r');
}
export function setBurstOfftime(offtime: number) {
    sendCommand('set boff ' + offtime + '\r');
}
export function setOfftime(number: number) {
    sendCommand('set pwd ' + number + '\r');
}
export function setTransientEnabled(enable: boolean) {
    sendCommand('tr '+enable?'on':'off');
}