import {type} from "os";
import {terminal} from "../../gui/constants";
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

    public pressButton(port: string): IConnectionState {
        console.log("Connecting");
        return new Connecting(Idle.connectInternal(port));
    }

    public tick(): IConnectionState {
        return this;
    }

    private static async connectInternal(port: string): Promise<IUD3Connection | undefined> {
        let result: IUD3Connection | undefined;
        if (port.indexOf(".") >= 0) {
            terminal.io.println("\r\nConnect: " + port);
            result = createEthernetConnection(port);
        } else {
            terminal.io.println("\r\nConnect: Serial");
            if (port !== "") {
                result = createSerialConnection(port);
            } else {
                result = await Idle.autoConnectSerial();
            }
        }
        return result;
    }

    private static async autoConnectSerial(): Promise<IUD3Connection | undefined> {
        const all = await SerialPort.list();
        // TODO config
        const expectedProduct = "62002";
        const expectedVendor = "1204";
        for (const port of all) {
            if (port.vendorId === expectedVendor && port.productId === expectedProduct) {
                terminal.io.println("Auto connecting to " + port.path);
                return createSerialConnection(port.path);
            }
        }
        return undefined;
    }
}
