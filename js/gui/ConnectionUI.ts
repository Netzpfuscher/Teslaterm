import * as $ from "jquery";
import {config} from "../init";
import {port} from "../midi/midi_server";
import * as ui_helper from "./ui_helper";
import ChangeEvent = W2UI.ChangeEvent;

// Fields
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
const connection_types = [
    {id: eth_node, text: "Ethernet to UD3-node"},
    {id: serial_min, text: "Serial (MIN)"},
    {id: serial_plain, text: "Serial (Plain)"},
];

export async function openUI(): Promise<any> {
    await ui_helper.openPopup({
        body: '<div id="form" style="width: 100%; height: 100%;"></div>',
        style: 'padding: 15px 0px 0px 0px',
        title: 'Connection UI',
    });
    return new Promise<any>((res, rej) => {
        recreateForm(connection_types[1], true, res, rej);
    });
}

function recreateForm(selected_type: { id: string, text: string }, initial: boolean, resolve: (any) => void, reject: () => void) {
    let defaultValues = {
        connection_type: selected_type,
        serial_port: config.serial_port,
        baudrate: config.baudrate,
        remote_ip: config.remote_ip,
        telnet_port: config.telnetPort,
        midi_port: config.midiPort,
        sid_port: config.sidPort
    };
    console.log(defaultValues);
    if (w2ui.connection_ui) {
        for (const field of w2ui.connection_ui.fields) {
            defaultValues[field.name] = w2ui.connection_ui.record[field.name];
        }
        w2ui.connection_ui.destroy();
    }
    console.log(defaultValues);
    let fields = [
        {
            name: connection_type,
            type: "list",
            html: {
                caption: "Connection type",
            }
        }
    ];
    switch (selected_type.id) {
        case serial_min:
        case serial_plain:
            addField(fields, serial_port, "Serial port", "text", "Autoconnect");
            addField(fields, baudrate, "Baudrate", "int");
            break;
        case eth_node:
            addField(fields, remote_ip, "Remote IP");
            addField(fields, telnet_port, "Telnet port", "int");
            addField(fields, midi_port, "MIDI port", "int");
            addField(fields, sid_port, "SID port", "int");
            break;
        default:
            throw new Error("Unknown connection type: " + selected_type);
    }
    $().w2form({
        name: "connection_ui",
        fields: fields,
        focus: initial ? 0 : 1,
        record: defaultValues,
        actions: {
            Cancel: () => {
                w2popup.close();
                reject();
            },
            Connect: () => {
                w2popup.close();
                resolve(w2ui.connection_ui.record);
            }
        }
    });
    $('#w2ui-popup #form').w2render('connection_ui');
    const selector = $("input[name=" + connection_type + "]");
    selector.w2field("list", {
        items: connection_types,
    });
    selector.data("selected", selected_type);
    selector.change();
    w2ui.connection_ui.on("change", ev => onChange(ev, resolve, reject));
}

function onChange(event: ChangeEvent, resolve: (any) => void, reject: () => void) {
    if (event.target === connection_type) {
        if (!event.value_old || event.value_new.id !== event.value_old.id) {
            recreateForm(event.value_new, false, resolve, reject);
        }
    }
}

function addField(fields: any[], id: string, title: string, type: string = "text", placeholder?: string) {
    fields[fields.length] = {
        name: id,
        type: type,
        autoFormat: false,
        html: {
            caption: title,
            attr: placeholder ? ("placeholder=" + placeholder) : undefined
        }
    };
}
