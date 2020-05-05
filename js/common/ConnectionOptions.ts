// Fields
import {TTConfig} from "./TTConfig";

export const connection_type = "connection_type";
export const serial_port = "serial_port";
export const baudrate = "baudrate";
export const remote_ip = "remote_ip";
export const telnet_port = "telnet_port";
export const midi_port = "midi_port";
export const sid_port = "sid_port";

// Connection types
export const eth_node = "eth";
export const serial_min = "min";
export const serial_plain = "serial";
export const connection_types = [
    {id: eth_node, text: "Ethernet to UD3-node"},
    {id: serial_min, text: "Serial (MIN)"},
    {id: serial_plain, text: "Serial (Plain)"},
];

export function getDefaultConnectOptions(for_autoconnect: boolean, config: TTConfig): any {
    let ret = {
        serial_port: config.serial_port,
        baudrate: config.baudrate,
        remote_ip: config.remote_ip,
        telnet_port: config.telnetPort,
        midi_port: config.midiPort,
        sid_port: config.sidPort
    };
    for (const type of connection_types) {
        if (type.id === config.autoconnect) {
            ret[connection_type] = type;
            break;
        }
    }
    if (for_autoconnect && !ret[connection_type]) {
        return undefined;
    } else {
        return ret;
    }
}
