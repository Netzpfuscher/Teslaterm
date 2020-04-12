import * as $ from 'jquery';
import {resetResponseTimeout} from "../connection/state/Connected";
import {terminal} from '../gui/constants';
import {meters} from '../gui/gauges';
import * as menu from '../gui/menu';
import * as scope from '../gui/oscilloscope/oscilloscope';
import {bytes_to_signed, convertArrayBufferToString} from '../helper';
import {config} from '../init';
import * as commands from '../network/commands';
import * as sid from "../sid/sid";
import {
    DATA_LEN,
    DATA_NUM,
    DATA_TYPE,
    TT_CHART,
    TT_CHART_CLEAR,
    TT_CHART_CONF,
    TT_CHART_DRAW,
    TT_CHART_LINE,
    TT_CHART_TEXT,
    TT_CHART_TEXT_CENTER,
    TT_CONFIG_GET,
    TT_GAUGE,
    TT_GAUGE_CONF,
    TT_STATE_COLLECT,
    TT_STATE_FRAME,
    TT_STATE_IDLE,
    TT_STATE_SYNC,
    TYPE_CHAR,
    TYPE_FLOAT,
    TYPE_SIGNED, TYPE_STRING,
    TYPE_UNSIGNED,
} from "../connection/constants";


export let busActive: boolean = false;
export let busControllable: boolean = false;
export let transientActive: boolean = false;

let term_state: number = 0;

let udconfig = [];

function compute(dat: number[]) {
    let str: string;
    switch (dat[DATA_TYPE]) {
        case TT_GAUGE:
            meters[dat[DATA_NUM]].value(bytes_to_signed(dat[3], dat[4]));
            break;
        case TT_GAUGE_CONF:
            const index = dat[DATA_NUM];
            const gauge_min = bytes_to_signed(dat[3], dat[4]);
            const gauge_max = bytes_to_signed(dat[5], dat[6]);
            dat.splice(0, 7);
            str = convertArrayBufferToString(dat);
            meters[index].text(str);
            meters[index].range(gauge_min, gauge_max);
            scope.redrawInfo();
            break;
        case TT_CHART_CONF: {
            const chart_num = dat[2].valueOf();
            scope.traces[chart_num].configure(dat);
            break;
        }
        case TT_CHART: {
            const val = bytes_to_signed(dat[3], dat[4]);
            const chart_num = dat[DATA_NUM].valueOf();
            scope.addValue(chart_num, val);
            break;
        }
        case TT_CHART_DRAW:
            scope.drawChart();
            break;
        case TT_CHART_CLEAR:
            scope.beginControlledDraw();
            break;
        case TT_CHART_LINE:
            const x1 = bytes_to_signed(dat[2], dat[3]);
            const y1 = bytes_to_signed(dat[4], dat[5]);
            const x2 = bytes_to_signed(dat[6], dat[7]);
            const y2 = bytes_to_signed(dat[8], dat[9]);
            const color = dat[10].valueOf();
            scope.drawLine(x1, x2, y1, y2, color);

            break;
        case TT_CHART_TEXT:
            drawString(dat, false);
            break;
        case TT_CHART_TEXT_CENTER:
            drawString(dat, true);
            break;
        case TT_STATE_SYNC:
            setBusActive((dat[2] & 1) !== 0);
            setTransientActive((dat[2] & 2) !== 0);
            setBusControllable((dat[2] & 4) !== 0);
            break;
        case TT_CONFIG_GET:
            dat.splice(0, 2);
            str = convertArrayBufferToString(dat, false);
            if (str === "NULL;NULL") {
                ud_settings(udconfig);
                udconfig = [];
            } else {
                const substrings = str.split(";");
                udconfig.push(substrings);
            }
            break;
    }
}

function setBusActive(active) {
    if (active !== busActive) {
        busActive = active;
        menu.updateBusActive();
    }
}

function setTransientActive(active) {
    if (active !== transientActive) {
        transientActive = active;
        menu.updateTransientActive();
    }
}

function setBusControllable(controllable) {
    if (controllable !== busControllable) {
        busControllable = controllable;
        menu.updateBusControllable();
    }
}

function drawString(dat: number[], center: boolean) {
    const x = bytes_to_signed(dat[2], dat[3]);
    const y = bytes_to_signed(dat[4], dat[5]);
    const color = dat[6].valueOf();
    let size = dat[7].valueOf();
    if (size < 6) {
        size = 6;
    }
    dat.splice(0, 8);
    const str = convertArrayBufferToString(dat);
    scope.drawString(x, y, color, size, str, center);
}

let buffer: number[] = [];
let bytes_done: number = 0;

export function receive_media(data: Buffer) {
    const buf = new Uint8Array(data);
    if (buf[0] === 0x78) {
        sid.setSendingSID(false);
    }
    if (buf[0] === 0x6f) {
        sid.setSendingSID(true);
    }
}

export function receive_main(data: Buffer) {
    const buf = new Uint8Array(data);
    resetResponseTimeout();

    for (const byte of buf) {
        switch (term_state) {
            case TT_STATE_IDLE:
                if (byte === 0xff) {
                    term_state = TT_STATE_FRAME;
                } else {
                    const str = String.fromCharCode.apply(null, [byte]);
                    terminal.io.print(str);
                }
                break;

            case TT_STATE_FRAME:
                buffer[DATA_LEN] = byte;
                bytes_done = 0;
                term_state = TT_STATE_COLLECT;
                break;
            case TT_STATE_COLLECT:
                if (bytes_done === 0) {
                    buffer[0] = byte;
                    bytes_done++;
                } else {
                    buffer[bytes_done + 1] = byte;
                    bytes_done++;
                    if (bytes_done === buffer[DATA_LEN]) {
                        bytes_done = 0;
                        term_state = TT_STATE_IDLE;
                        compute(buffer);
                        buffer = [];
                    }
                }
                break;
        }
    }
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

    if (w2ui.foo) {
        w2ui.foo.original = [];
        w2ui.foo.record = [];
        for (const copy of trecords) {
            w2ui.foo.original[copy] = trecords[copy];
            w2ui.foo.record[copy] = trecords[copy];
        }
        w2ui.foo.refresh();
    }

    if (!w2ui.foo) {
        $().w2form({
            actions: {
                "save"() {
                    for (const changes of this.getChanges()) {
                        this.record[changes] = this.record[changes].replace(',', '.');
                        commands.setParam(changes, this.record[changes]);
                        // commands.sendCommand('set ' + changes + ' ' + this.record[changes] + '\r');
                        this.original[changes] = this.record[changes];
                    }
                    w2popup.close();
                },
                "save EEPROM"() {
                    for (const changes of this.getChanges()) {
                        this.record[changes] = this.record[changes].replace(',', '.');
                        commands.setParam(changes, this.record[changes]);
                        this.original[changes] = this.record[changes];
                    }
                    commands.eepromSave();
                    w2popup.close();
                },
            },
            fields: tfields,
            name: 'foo',
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
                ($('#w2ui-popup #form') as any).w2render('foo');
            };
        },
        onToggle(event) {
            $(w2ui.foo.box).hide();
            event.onComplete = () => {
                $(w2ui.foo.box).show();
                w2ui.foo.resize();
            };
        },
        showMax: true,
        style: 'padding: 15px 0px 0px 0px',
        title: 'UD3 Settings',
        width: 650,
    });
}
