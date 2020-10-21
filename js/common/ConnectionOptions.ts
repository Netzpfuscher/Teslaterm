// Fields
import {connection_types, serial_min} from "./constants";
import {TTConfig} from "./TTConfig";

export const connection_type = "connection_type";
export const serial_port = "serial_port";
export const baudrate = "baudrate";
export const remote_ip = "remote_ip";
export const udp_min_port = "udp_min_port";
export const telnet_port = "telnet_port";
export const midi_port = "midi_port";
export const sid_port = "sid_port";


export function getDefaultConnectOptions(for_autoconnect: boolean, config: TTConfig): any {
    let ret = {
        serial_port: config.serial.serial_port,
        baudrate: config.serial.baudrate,
        remote_ip: config.ethernet.remote_ip,
        telnet_port: config.ethernet.telnetPort,
        midi_port: config.ethernet.midiPort,
        sid_port: config.ethernet.sidPort,
        udp_min_port: config.ethernet.udpMinPort,
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
