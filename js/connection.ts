import * as gui from './gui';
import {terminal} from './gui';
import {ConnectionState} from "./telemetry";
import * as midi from './midi';
import * as chrome from 'chrome';
import {startConf} from "./commands";

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
        gui.onConnected();
        connState = ConnectionState.CONNECTED_IP;
        setTimeout(startConf, 200);
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
    if(connState==ConnectionState.CONNECTED_SERIAL)
        chrome.serial.disconnect(connid, ()=>terminal.io.println('\r\nDisconnected'));
    else if(connState==ConnectionState.CONNECTED_IP){
        chrome.sockets.tcp.disconnect(mainSocket, ()=> {
            chrome.sockets.tcp.close(mainSocket);
            terminal.io.println('\r\nDisconnected');
        });
        chrome.sockets.tcp.disconnect(socket_midi, ()=>
            chrome.sockets.tcp.close(socket_midi));
    }
    gui.onDisconnect();
    connState= ConnectionState.UNCONNECTED;
}

function connected_cb(connectionInfo){
    if(connectionInfo.connectionId){
        terminal.io.println("connected");
        connid = connectionInfo.connectionId;
        connState = ConnectionState.CONNECTED_SERIAL;
        w2ui['toolbar'].get('connect').text = 'Disconnect';
        w2ui['toolbar'].refresh();
        startConf();
    } else {
        terminal.io.println("failed!");
    }
}