import {terminal} from '../gui/gui';
import * as menu from '../gui/menu';
import * as telemetry from "./telemetry";
import {ConnectionState} from "./telemetry";
import * as commands from './commands';
import {populateMIDISelects} from "../midi/midi_ui";
import {createEthernetConnection} from "./ethernet";
import {createSerialConnection} from "./serial";
import SerialPort = require("serialport");

export interface UD3Connection {
    sendTelnet(data: Buffer);

    sendMedia(data: Buffer);

    connect(): Promise<void>;

    disconnect(): void;

    resetWatchdog(): void;

    tick(): void;
}

export let connection: UD3Connection | null = null;

const TIMEOUT = 50;
let response_timeout = TIMEOUT;
const WD_TIMEOUT = 5;
let wd_reset = 5;

let ipaddr: string = '0.0.0.0';

export function disconnect() {
    commands.stop();
    setTimeout(() => {
        if (connection) {
            connection.disconnect();
            connection = null;
        }
        menu.onDisconnect();
    }, 200);
}

function connectSerial(port: string): UD3Connection {
    return createSerialConnection(port);
}

export async function connect(port: string) {
    let connectionTemp: UD3Connection;
    if (port.indexOf(".") >= 0) {
        ipaddr = port;
        terminal.io.println("\r\nConnect: " + ipaddr);
        connectionTemp = createEthernetConnection(port);
    } else {
        terminal.io.println("\r\nConnect: Serial");
        if (port != "") {
            connectionTemp = connectSerial(port);
        } else {
            connectionTemp = await autoConnectSerial();
        }
    }
    try {
        await connectionTemp.connect();
        connection = connectionTemp;
        menu.onConnected();
        commands.startConf();
        populateMIDISelects();
    } catch (x) {
        terminal.io.println("Failed to connect");
        console.log("While connecting: ", x);
    }
}

async function autoConnectSerial(): Promise<UD3Connection> {
    const all = await SerialPort.list();
    //TODO config
    const expectedProduct = "62002";
    const expectedVendor = "1204";
    for (const port of all) {
        if (port.vendorId == expectedVendor && port.productId == expectedProduct) {
            return connectSerial(port.path);
        }
    }
}

export function resetTimeout() {
    response_timeout = TIMEOUT;
}

export function update() {
    if (connection) {
        response_timeout--;

        if (response_timeout == 0) {
            response_timeout = TIMEOUT;
            //terminal.io.println('Connection lost, reconnecting...');

            //TODO: Implement reconnect logic, probably type-specific
        }

        wd_reset--;
        if(wd_reset==0){
            wd_reset = WD_TIMEOUT;
            connection.resetWatchdog();
        }
        connection.tick();
    }
}
