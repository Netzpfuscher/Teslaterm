import {type} from "os";
import {
    baudrate, sid_port,
    connection_type,
    eth_node, midi_port,
    openUI, remote_ip,
    serial_min,
    serial_plain,
    serial_port, telnet_port
} from "../../gui/ConnectionUI";
import {terminal} from "../../gui/constants";
import {config} from "../../init";
import {media_state} from "../../media/media_player";
import {populateMIDISelects} from "../../midi/midi_ui";
import * as commands from "../commands";
import {createEthernetConnection} from "../types/ethernet";
import {IUD3Connection} from "../types/IUD3Connection";
import {createMinSerialConnection} from "../types/serial_min";
import {createPlainSerialConnection} from "../types/serial_plain";
import {Connecting} from "./Connecting";
import {IConnectionState} from "./IConnectionState";
import SerialPort = require("serialport");

export class Idle implements IConnectionState {
    public getActiveConnection(): IUD3Connection | undefined {
        return undefined;
    }

    public getButtonText(): string {
        return "Connect";
    }

    public pressButton(): IConnectionState {
        return new Connecting(Idle.connectInternal(), this);
    }

    public tick(): IConnectionState {
        return this;
    }

    public static async connectWithOptions(options: any): Promise<IUD3Connection | undefined> {
        const type = options[connection_type];
        switch (type.id) {
            case serial_plain:
                return this.connectSerial(options, createPlainSerialConnection);
            case serial_min:
                return this.connectSerial(options, createMinSerialConnection);
            case eth_node:
                return createEthernetConnection(options[remote_ip], options[telnet_port], options[midi_port], options[sid_port]);
            default:
                terminal.io.println("Connection type \"" + type.text + "\" (" + type.id + ") is currently not supported");
                return undefined;
        }
    }

    private static async connectInternal(): Promise<IUD3Connection | undefined> {
        const options = await openUI();
        return Idle.connectWithOptions(options);
    }

    private static async connectSerial(options: any, create: (port: string, baudrate: number) => IUD3Connection)
        : Promise<IUD3Connection | undefined> {
        if (options[serial_port]) {
            return create(options[serial_port], options[baudrate]);
        } else {
            return this.autoConnectSerial(options[baudrate], create);
        }
    }

    private static async autoConnectSerial(baudrate: number,
                                           create: (port: string, baudrate: number) => IUD3Connection)
        : Promise<IUD3Connection | undefined> {
        const all = await SerialPort.list();
        for (const port of all) {
            if (port.vendorId === config.vendorID && port.productId === config.productID) {
                terminal.io.println("Auto connecting to " + port.path);
                return create(port.path, baudrate);
            }
        }
        terminal.io.println("Did not find port to auto-connect to");
        return undefined;
    }
}
