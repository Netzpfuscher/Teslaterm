import {type} from "os";
import {
    baudrate, command_port,
    connection_type,
    eth_node, media_port,
    openUI, remote_ip,
    serial_min,
    serial_plain,
    serial_port, telnet_port
} from "../../gui/ConnectionUI";
import {terminal} from "../../gui/constants";
import {config} from "../../init";
import {media_state} from "../../media/media_player";
import {populateMIDISelects} from "../../midi/midi_ui";
import * as commands from "../../network/commands";
import {createEthernetConnection} from "../ethernet";
import {IUD3Connection} from "../IUD3Connection";
import {createSerialConnection} from "../serial";
import {Connecting} from "./Connecting";
import {IConnectionState} from "./IConnectionState";
import SerialPort = require("serialport");

export class Idle implements IConnectionState {
    public getActiveConnection(): IUD3Connection | undefined {
        return undefined;
    }

    public getButtonText(): string {
        return "Not connected";
    }

    public getButtonTooltip(): string {
        return "Click to connect";
    }

    public pressButton(): IConnectionState {
        return new Connecting(Idle.connectInternal());
    }

    public tick(): IConnectionState {
        return this;
    }

    private static async connectInternal(): Promise<IUD3Connection | undefined> {
        const options = await openUI();
        const type = options[connection_type];
        switch (type.id) {
            case serial_min:
                if (options[serial_port]) {
                    return createSerialConnection(options[serial_port], options[baudrate]);
                } else {
                    return this.autoConnectSerial(options[baudrate]);
                }
            case eth_node:
                return createEthernetConnection(options[remote_ip], options[telnet_port], options[media_port], options[command_port]);
            case serial_plain:
            default:
                terminal.io.println("Connection type \"" + type.text + "\" (" + type.id + ") is currently not supported");
                return undefined;
        }
    }

    private static async autoConnectSerial(baudrate: number): Promise<IUD3Connection | undefined> {
        const all = await SerialPort.list();
        for (const port of all) {
            if (port.vendorId === config.vendorID && port.productId === config.productID) {
                terminal.io.println("Auto connecting to " + port.path);
                return createSerialConnection(port.path, baudrate);
            }
        }
        terminal.io.println("Did not find port to auto-connect to");
        return undefined;
    }
}
