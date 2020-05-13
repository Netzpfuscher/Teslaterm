import {
    baudrate,
    connection_type, eth_node,
    midi_port,
    remote_ip,
    serial_min,
    serial_plain, serial_port, sid_port, telnet_port
} from "../../../common/ConnectionOptions";
import {ConnectionUIIPC} from "../../ipc/ConnectionUI";
import {TerminalIPC} from "../../ipc/terminal";
import {config} from "../../init";
import {createEthernetConnection} from "../types/ethernet";
import {TerminalHandle, UD3Connection} from "../types/UD3Connection";
import {createMinSerialConnection} from "../types/serial_min";
import {createPlainSerialConnection} from "../types/serial_plain";
import {Connecting} from "./Connecting";
import {IConnectionState} from "./IConnectionState";
import SerialPort = require("serialport");

export class Idle implements IConnectionState {
    public getActiveConnection(): UD3Connection | undefined {
        return undefined;
    }

    public getAutoTerminal(): TerminalHandle | undefined {
        return undefined;
    }

    public getButtonText(): string {
        return "Connect";
    }

    public pressButton(window: object): IConnectionState {
        return new Connecting(Idle.connectInternal(window), this);
    }

    public tick(): IConnectionState {
        return this;
    }

    public static async connectWithOptions(options: any): Promise<UD3Connection | undefined> {
        console.log(options);
        const type = options[connection_type];
        switch (type.id) {
            case serial_plain:
                return this.connectSerial(options, createPlainSerialConnection);
            case serial_min:
                return this.connectSerial(options, createMinSerialConnection);
            case eth_node:
                return createEthernetConnection(options[remote_ip], options[telnet_port], options[midi_port], options[sid_port]);
            default:
                TerminalIPC.println("Connection type \"" + type.text + "\" (" + type.id + ") is currently not supported");
                return undefined;
        }
    }

    private static async connectInternal(window: object): Promise<UD3Connection | undefined> {
        try {
            const options = await ConnectionUIIPC.openConnectionUI(window);
            return Idle.connectWithOptions(options);
        } catch (e) {
            return Promise.resolve(undefined);
        }
    }

    private static async connectSerial(options: any, create: (port: string, baudrate: number) => UD3Connection)
        : Promise<UD3Connection | undefined> {
        if (options[serial_port]) {
            return create(options[serial_port], options[baudrate]);
        } else {
            return this.autoConnectSerial(options[baudrate], create);
        }
    }

    private static async autoConnectSerial(baudrate: number,
                                           create: (port: string, baudrate: number) => UD3Connection)
        : Promise<UD3Connection | undefined> {
        const all = await SerialPort.list();
        for (const port of all) {
            if (port.vendorId === config.vendorID && port.productId === config.productID) {
                TerminalIPC.println("Auto connecting to " + port.path);
                return create(port.path, baudrate);
            }
        }
        TerminalIPC.println("Did not find port to auto-connect to");
        return undefined;
    }
}
