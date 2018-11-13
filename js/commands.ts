import {terminal} from "./gui";
import {ConnectionState, connid, connState, socket} from "./telemetry";
import * as helper from './helper';
import * as chrome from 'chrome';//TODO how do I make this work?

function send_command(command){
    if(connState==ConnectionState.CONNECTED_SERIAL){
        chrome.serial.send(connid, helper.convertStringToArrayBuffer(command));
    }
    if(connState==ConnectionState.CONNECTED_IP){
        chrome.sockets.tcp.send(socket, helper.convertStringToArrayBuffer(command));
    }
}

function clear(){
    // \033=\u1B
    terminal.io.print('\u001B[2J\u001B[0;0H');
    send_command('cls\r');
}