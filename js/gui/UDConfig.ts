import * as $ from "jquery";
import {TYPE_CHAR, TYPE_FLOAT, TYPE_SIGNED, TYPE_STRING, TYPE_UNSIGNED} from "../connection/constants";
import {config} from "../init";
import * as commands from "../network/commands";

async function saveAndClose(form) {
    for (const change of Object.keys(form.getChanges())) {
        form.record[change] = form.record[change].replace(',', '.');
        await commands.setParam(change, form.record[change]);
        form.original[change] = form.record[change];
    }
    w2popup.close();
}

export function ud_settings(uconfig) {
    const tfields = [];
    const trecords = [];
    for (const data of uconfig) {
        let inipage: number = config.udConfigPages[data[0]];
        if (!inipage) {
            inipage = 0;
        }
        switch (parseInt(data[2], 10)) {
            case TYPE_CHAR:
                tfields.push({
                    field: data[0],
                    html: {caption: data[0], text: '<i>' + data[6] + '</i>', page: inipage, column: 0},
                    type: 'text',
                });
                break;
            case TYPE_FLOAT:
                tfields.push({
                    field: data[0],
                    html: {
                        caption: data[0],
                        column: 0,
                        page: inipage,
                        text: '<i>' + data[6] + '</i><br>       <b>MIN:</b> ' + data[4] + '   <b>MAX:</b> ' + data[5],
                    },
                    type: 'text',
                });
                break;
            case TYPE_SIGNED:
                tfields.push({
                    field: data[0],
                    html: {
                        caption: data[0],
                        column: 0,
                        page: inipage,
                        text: '<i>' + data[6] + '</i><br>       <b>MIN:</b> ' + data[4] + '   <b>MAX:</b> ' + data[5],
                    },
                    type: 'text',
                });
                break;
            case TYPE_STRING:
                tfields.push({
                    field: data[0],
                    html: {caption: data[0], text: '<i>' + data[6] + '</i>', page: inipage, column: 0},
                    type: 'text',
                });
                break;
            case TYPE_UNSIGNED:
                tfields.push({
                    field: data[0],
                    html: {
                        caption: data[0],
                        column: 0,
                        page: inipage,
                        text: '<i>' + data[6] + '</i><br>       <b>MIN:</b> ' + data[4] + '   <b>MAX:</b> ' + data[5],
                    },
                    type: 'text',
                });
                break;
        }

        trecords[data[0]] = data[1];
    }

    if (w2ui.udconfigui) {
        w2ui.udconfigui.original = [];
        w2ui.udconfigui.record = [];
        for (const copy of trecords) {
            w2ui.udconfigui.original[copy] = trecords[copy];
            w2ui.udconfigui.record[copy] = trecords[copy];
        }
        w2ui.udconfigui.refresh();
    }

    if (!w2ui.udconfigui) {
        $().w2form({
            actions: {
                "save"() {
                    saveAndClose(this);
                },
                "save EEPROM"() {
                    saveAndClose(this)
                        .then(() => commands.eepromSave());
                },
            },
            fields: tfields,
            name: 'udconfigui',
            record: trecords,
            style: 'border: 0px; background-color: transparent;',
            tabs: [
                {id: 'tab1', caption: 'General'},
                {id: 'tab2', caption: 'Timing'},
                {id: 'tab3', caption: 'Feedback'},
                {id: 'tab4', caption: 'IP'},
                {id: 'tab5', caption: 'Serial'},
                {id: 'tab6', caption: 'Current'},
            ],
        });
    }
    w2popup.open({
        body: '<div id="form" style="width: 100%; height: 100%;"></div>',
        height: 650,
        onOpen(event) {
            event.onComplete = () => {
                // specifying an onOpen handler instead is equivalent to specifying an onBeforeOpen handler,
                // which would make this code execute too early and hence not deliver.
                // TODO: Property 'w2render' does not exist on type 'JQuery<HTMLElement>'.
                ($('#w2ui-popup #form') as any).w2render('udconfigui');
            };
        },
        onToggle(event) {
            $(w2ui.udconfigui.box).hide();
            event.onComplete = () => {
                $(w2ui.udconfigui.box).show();
                w2ui.udconfigui.resize();
            };
        },
        showMax: true,
        style: 'padding: 15px 0px 0px 0px',
        title: 'UD3 Settings',
        width: 650,
    });
}
