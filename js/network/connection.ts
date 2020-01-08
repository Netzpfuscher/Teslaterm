import * as gui from '../gui/gui';
import {terminal} from '../gui/gui';
import * as menu from '../gui/menu';
import {ConnectionState} from "./telemetry";
import * as commands from './commands';
import {reconnect} from './commands';
import {populateMIDISelects} from "../midi/midi_ui";
export let socket_midi: number|undefined;


const TIMEOUT = 50;
let response_timeout = TIMEOUT;
const WD_TIMEOUT = 5;
let wd_reset = 5;
const wd_reset_msg=new Uint8Array([0xFF, 0xF1]);

export let mainSocket: number|undefined;
export let connid: number|undefined;
let ipaddr:string = '0.0.0.0';
//previously int connected. 0->Unconnected, 2->Serial, 1->IP
export let connState: ConnectionState = ConnectionState.UNCONNECTED;
function connect_ip(){
    chrome.sockets.tcp.create({}, createInfo);
    chrome.sockets.tcp.create({}, createInfo_midi);
}

function reconnect_tel(){
    chrome.sockets.tcp.disconnect(mainSocket,callback_dsk);
}

function callback_dsk() {
    chrome.sockets.tcp.close(mainSocket, function clb() {
        chrome.sockets.tcp.create({}, createInfo);
    });

}

function reconnect_midi() {
    chrome.sockets.tcp.disconnect(socket_midi, callback_dsk_midi);
}

function callback_dsk_midi() {
    chrome.sockets.tcp.close(socket_midi, function clb() {
        chrome.sockets.tcp.create({}, createInfo_midi);
    });
}

function createInfo(info){
    mainSocket = info.socketId;

    console.log(ipaddr);

    chrome.sockets.tcp.connect(mainSocket,ipaddr,2323, callback_sck);


}

function createInfo_midi(info){
    socket_midi = info.socketId;
    chrome.sockets.tcp.connect(socket_midi,ipaddr,2324, callback_sck_midi);

}
function callback_sck(result){
    if (result >= 0) {
        menu.onConnected();
        connState = ConnectionState.CONNECTED_IP;
        setTimeout(commands.startConf, 200);
        populateMIDISelects();
    } else {
        terminal.io.print("Failed to connect main socket: ");
        if (chrome.runtime.lastError) {
            terminal.io.println(chrome.runtime.lastError.message);
        } else {
            terminal.io.println(result);
        }
    }
}



function callback_sck_midi(info) {
    if (info < 0) {
        terminal.io.print("Failed to connect MIDI socket: ");
        if (chrome.runtime.lastError) {
            terminal.io.println(chrome.runtime.lastError.message);
        } else {
            terminal.io.println(info);
        }
    }
}

function midi_socket_ckeck(info){
    if(info.connected==false){
        reconnect_midi();
    }
}
function telnet_socket_ckeck(info){
    if(info.connected==false){
        reconnect_tel();
    }
}

export function disconnect() {
    commands.stop();
    setTimeout(() => {
        if (connState == ConnectionState.CONNECTED_SERIAL)
            chrome.serial.disconnect(connid, () => gui.terminal.io.println('\r\nDisconnected'));
        else if (connState == ConnectionState.CONNECTED_IP) {
            chrome.sockets.tcp.disconnect(mainSocket, () => {
                chrome.sockets.tcp.close(mainSocket);
                gui.terminal.io.println('\r\nDisconnected');
            });
            chrome.sockets.tcp.disconnect(socket_midi, () =>
                chrome.sockets.tcp.close(socket_midi));
        }
        menu.onDisconnect();
        connState = ConnectionState.UNCONNECTED;
    }, 200);
}

export function connect(port: string) {
    if(port.indexOf(".")>=0){
        ipaddr=port;
        terminal.io.println("\r\nConnect: "+ ipaddr);
        connect_ip();

    }else{
        terminal.io.println("\r\nConnect: Serial");
        chrome.serial.getDevices(getdevs);
    }
}

function connected_cb(connectionInfo){
    if(connectionInfo.connectionId){
        connid = connectionInfo.connectionId;
        connState = ConnectionState.CONNECTED_SERIAL;
        menu.onConnected();
        commands.startConf();
    } else {
        gui.terminal.io.println("failed!");
    }
}

function getdevs(devices){
    for (var i = 0; i < devices.length; i++) {
        if((devices[i].displayName && devices[i].displayName.indexOf("STMBL") > -1) || (devices[i].vendorId && devices[i].vendorId == 1204 && devices[i].productId && devices[i].productId == 62002)){
            terminal.io.println("Connecting to " + devices[i].path);
            chrome.serial.connect(devices[i].path, connected_cb);
            return;
        }
        terminal.io.println(devices[i].path + ' ' + devices[i].displayName + ' ' + devices[i].vendorId + ' ' + devices[i].productId );
    }

    var test = w2ui['toolbar'].get('port');

    if(test.value){
        terminal.io.println('UD3 not found connect to: '+ test.value);
        chrome.serial.connect(test.value, connected_cb);
    }else{
        terminal.io.println('No COM specified trying COM12');
        chrome.serial.connect('COM12', connected_cb);
    }


}

export function resetTimeout() {
    response_timeout = TIMEOUT;
}

export function update() {
    if(connState!=ConnectionState.UNCONNECTED){
        response_timeout--;

        if(response_timeout==0){
            response_timeout=TIMEOUT;
            terminal.io.println('Connection lost, reconnecting...');

            reconnect();
            chrome.sockets.tcp.getInfo(socket_midi, midi_socket_ckeck);
            chrome.sockets.tcp.getInfo(mainSocket, telnet_socket_ckeck);
        }

        wd_reset--;
        if(wd_reset==0){
            wd_reset=WD_TIMEOUT;
            commands.resetWatchdog();
        }


    }
}
