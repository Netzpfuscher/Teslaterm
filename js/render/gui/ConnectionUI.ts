import {
    baudrate,
    connection_type, connection_types, eth_node,
    getDefaultConnectOptions, midi_port, remote_ip,
    serial_min,
    serial_plain,
    serial_port, sid_port, telnet_port
} from "../../common/ConnectionOptions";
import {config} from "../ipc/Misc";
import * as ui_helper from "./ui_helper";
import ChangeEvent = W2UI.ChangeEvent;

export async function openUI(): Promise<any> {
    await ui_helper.openPopup({
        body: '<div id="form" style="width: 100%; height: 100%;"></div>',
        style: 'padding: 15px 0px 0px 0px',
        title: 'Connection UI',
    });
    return new Promise<any>((res, rej) => {
        recreateForm(connection_types[1], res, rej);
    });
}

function recreateForm(selected_type: { id: string, text: string }, resolve: (cfg: object) => void, reject: (e: any) => void) {
    let defaultValues = getDefaultConnectOptions(false, config);
    if (!defaultValues[connection_type]) {
        defaultValues[connection_type] = selected_type;
    }
    if (w2ui.connection_ui) {
        for (const field of w2ui.connection_ui.fields) {
            defaultValues[field.name] = w2ui.connection_ui.record[field.name];
        }
        w2ui.connection_ui.destroy();
    }
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
        focus: 1,
        record: defaultValues,
        actions: {
            Cancel: () => {
                w2popup.close();
                reject("Cancelled");
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

function onChange(event: ChangeEvent, resolve: (cfg: object) => void, reject: (e: any) => void) {
    if (event.target === connection_type) {
        if (!event.value_old || event.value_new.id !== event.value_old.id) {
            recreateForm(event.value_new, resolve, reject);
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
