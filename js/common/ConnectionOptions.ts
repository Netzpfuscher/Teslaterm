// Fields
import {connection_types, serial_min} from "../main/TTConfigLoader";
import {TTConfig} from "./TTConfig";

export const connection_type = "connection_type";
export const serial_port = "serial_port";
export const baudrate = "baudrate";
export const remote_ip = "remote_ip";
export const telnet_port = "telnet_port";
export const midi_port = "midi_port";
export const sid_port = "sid_port";


export function getDefaultConnectOptions(for_autoconnect: boolean, config: TTConfig): any {
    let ret = {
        serial_port: config.serial_port,
        baudrate: config.baudrate,
        remote_ip: config.remote_ip,
        telnet_port: config.telnetPort,
        midi_port: config.midiPort,
        sid_port: config.sidPort
    };
    if (connection_types.has(config.autoconnect)) {
        ret[connection_type] = config.autoconnect;
    }
    if (for_autoconnect && !ret[connection_type]) {
        return undefined;
    } else {
        if (!ret[connection_type]) {
            ret[connection_type] = serial_min;
        }
        return ret;
    }
}
