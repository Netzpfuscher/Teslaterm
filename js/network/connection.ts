import SerialPort = require("serialport");
import {terminal} from '../gui/constants';
import * as menu from '../gui/menu';
import {populateMIDISelects} from "../midi/midi_ui";
import * as commands from './commands';
import {createEthernetConnection} from "./ethernet";
import {IUD3Connection} from "./IUD3Connection";
import {createSerialConnection} from "./serial";

export let connection: IUD3Connection | null = null;

const TIMEOUT = 50;
let response_timeout = TIMEOUT;
const WD_TIMEOUT = 5;
let wd_reset = WD_TIMEOUT;

let ipaddr: string = '0.0.0.0';

export async function disconnect() {
    await commands.stop();
    if (connection) {
        connection.disconnect();
        connection = null;
    }
    menu.onDisconnect();
}

function connectSerial(port: string): IUD3Connection {
    return createSerialConnection(port);
}

export async function connect(port: string) {
    let connectionTemp: IUD3Connection;
    if (port.indexOf(".") >= 0) {
        ipaddr = port;
        terminal.io.println("\r\nConnect: " + ipaddr);
        connectionTemp = createEthernetConnection(port);
    } else {
        terminal.io.println("\r\nConnect: Serial");
        if (port !== "") {
            connectionTemp = connectSerial(port);
        } else {
            connectionTemp = await autoConnectSerial();
        }
    }
    try {
        await connectionTemp.connect();
        connection = connectionTemp;
        menu.onConnected();
        await commands.startConf();
        populateMIDISelects();
    } catch (x) {
        terminal.io.println("Failed to connect");
        console.log("While connecting: ", x);
        if (connection) {
            await disconnect();
        }
    }
}

async function autoConnectSerial(): Promise<IUD3Connection> {
    const all = await SerialPort.list();
    // TODO config
    const expectedProduct = "62002";
    const expectedVendor = "1204";
    for (const port of all) {
        if (port.vendorId === expectedVendor && port.productId === expectedProduct) {
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

        if (response_timeout === 0) {
            response_timeout = TIMEOUT;
            // terminal.io.println('Connection lost, reconnecting...');

            // TODO: Implement reconnect logic, probably type-specific
        }

        wd_reset--;
        if (wd_reset === 0) {
            wd_reset = WD_TIMEOUT;
            connection.resetWatchdog();
        }
        connection.tick();
    }
}
