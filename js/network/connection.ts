import * as gui from '../gui/gui';
import * as menu from '../gui/menu';
import {ConnectionState} from "./telemetry";
import * as midi from '../midi/midi';
// @ts-ignore TODO remove
import * as chrome from 'chrome';
import * as commands from './commands';
import {terminal} from "../gui/gui";

export let socket_midi: number|undefined;


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

function callback_dsk(info){
    chrome.sockets.tcp.close(mainSocket, function clb(){chrome.sockets.tcp.create({}, createInfo);});

}
function reconnect_midi(){
    chrome.sockets.tcp.disconnect(socket_midi,callback_dsk_midi);
}

function callback_dsk_midi(info){
    chrome.sockets.tcp.close(socket_midi, function clb(){chrome.sockets.tcp.create({}, createInfo_midi);});
}

function createInfo(info){
    mainSocket = info.socketId;

    console.log(ipaddr);

    chrome.sockets.tcp.connect(mainSocket,ipaddr,23, callback_sck);


}

function createInfo_midi(info){
    socket_midi = info.socketId;
    chrome.sockets.tcp.connect(socket_midi,ipaddr,123, callback_sck_midi);

}
function callback_sck(result){
    if(!result){
        menu.onConnected();
        connState = ConnectionState.CONNECTED_IP;
        setTimeout(commands.startConf, 200);
        midi.populateMIDISelects();
    }
}



function callback_sck_midi(info){

}

var onReceive = function(info) {
    if (info.socketId !== mainSocket)
        return;
    console.log(info.data);
};

var check_cnt=0;


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
        gui.terminal.io.println("connected");
        connid = connectionInfo.connectionId;
        connState = ConnectionState.CONNECTED_SERIAL;
        w2ui['toolbar'].get('connect').text = 'Disconnect';
        w2ui['toolbar'].refresh();
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