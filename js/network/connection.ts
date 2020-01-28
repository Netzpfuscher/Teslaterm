import * as gui from '../gui/gui';
import {terminal} from '../gui/gui';
import * as menu from '../gui/menu';
import * as telemetry from "./telemetry";
import * as commands from './commands';
import {populateMIDISelects} from "../midi/midi_ui";
import * as net from "net";
import {ConnectionState} from "./telemetry";


const TIMEOUT = 50;
let response_timeout = TIMEOUT;
const WD_TIMEOUT = 5;
let wd_reset = 5;

export let mainSocket: net.Socket | undefined;
export let mediaSocket: net.Socket | undefined;
//TODO what is this?
export let connid: number | undefined;
let ipaddr: string = '0.0.0.0';
//previously int connected. 0->Unconnected, 2->Serial, 1->IP
export let connState: telemetry.ConnectionState = telemetry.ConnectionState.UNCONNECTED;

function connectSocket(port: number, desc: string, dataCallback: (data: Buffer) => void) {
    const ret = net.createConnection({port: port, host: ipaddr}, () => {
        terminal.io.println("Connected socket " + desc);
    });
    ret.on('end', () => {
        terminal.io.println("Socket " + desc + " disconnected");
    });
    ret.addListener('error', (e: Error) => {
        terminal.io.println("Error on " + desc + " socket!");
        console.error(e);
    });
    ret.on('data', dataCallback);
    return ret;
}

function connect_ip() {
    if (mediaSocket) {
        reconnect_midi();
    } else {
        createMedia();
    }
    if (mainSocket) {
        reconnect_tel();
    } else {
        createMain();
    }
}

function createMain(): void {
    mainSocket = connectSocket(2323, "main", telemetry.receive_main);
    mainSocket.addListener('close', (errored: boolean) => {
        if (!errored) {
            terminal.io.println("Disconnected");
        }
    });
    mainSocket.addListener('connect', () => {
        menu.onConnected();
        connState = ConnectionState.CONNECTED_IP;
        commands.startConf();
        populateMIDISelects();
    });
}

function createMedia(): void {
    mediaSocket = connectSocket(2324, "media", telemetry.receive_media);
}

function reconnect_tel() {
    mainSocket.destroy();
    createMain();
}

function reconnect_midi() {
    mediaSocket.destroy();
    createMedia();
}

export function disconnect() {
    commands.stop();
    setTimeout(() => {
        if (connState == ConnectionState.CONNECTED_SERIAL)
            chrome.serial.disconnect(connid, () => gui.terminal.io.println('\r\nDisconnected'));
        else if (connState == ConnectionState.CONNECTED_IP) {
            mainSocket.destroy();
            mediaSocket.destroy();
            mediaSocket = undefined;
            mainSocket = undefined;
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

        if(response_timeout==0) {
            response_timeout = TIMEOUT;
            terminal.io.println('Connection lost, reconnecting...');

            reconnect_midi();
            reconnect_tel();
        }

        wd_reset--;
        if(wd_reset==0){
            wd_reset=WD_TIMEOUT;
            commands.resetWatchdog();
        }


    }
}
