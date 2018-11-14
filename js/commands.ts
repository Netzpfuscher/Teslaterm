import {terminal} from "./gui";
import {ConnectionState, connState} from "./telemetry";
import * as helper from './helper';
import {connid, mainSocket} from "./connection";
import * as chrome from 'chrome';

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

export function reconnect(){
    send_command('tterm start\r');
}

export function startConf(){
    send_command('\r');
    send_command('set pw 0\r');
    send_command('set pwd 50000\r');
    send_command('kill reset\rtterm start\rcls\r');

}