import {Menu} from "../ipc/Menu";
import {Meters} from "../ipc/meters";
import {Misc} from "../ipc/Misc";
import {Scope} from "../ipc/Scope";
import {Terminal} from "../ipc/terminal";
import {resetResponseTimeout} from "./state/Connected";
import {bytes_to_signed, convertArrayBufferToString, convertBufferToString} from '../helper';
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
    TT_STATE_SYNC, UNITS,
} from "../../common/constants";


export let busActive: boolean = false;
export let busControllable: boolean = false;
export let transientActive: boolean = false;

let term_state: number = 0;

let udconfig: string[][] = [];

function compute(dat: number[]) {
    let str: string;
    switch (dat[DATA_TYPE]) {
        case TT_GAUGE:
            Meters.setValue(dat[DATA_NUM], bytes_to_signed(dat[3], dat[4]));
            break;
        case TT_GAUGE_CONF:
            const index = dat[DATA_NUM];
            const gauge_min = bytes_to_signed(dat[3], dat[4]);
            const gauge_max = bytes_to_signed(dat[5], dat[6]);
            dat.splice(0, 7);
            str = convertBufferToString(dat);
            Meters.configure(index, gauge_min, gauge_max, str);
            Scope.refresh();
            break;
        case TT_CHART_CONF: {
            const traceId = dat[2].valueOf();
            const min = bytes_to_signed(dat[3], dat[4]);
            const max = bytes_to_signed(dat[5], dat[6]);
            const offset = bytes_to_signed(dat[7], dat[8]);
            const unit = UNITS[dat[9]];
            dat.splice(0, 10);
            const name = convertBufferToString(dat);
            Scope.configure(traceId, min, max, offset, unit, name);
            break;
        }
        case TT_CHART: {
            const val = bytes_to_signed(dat[3], dat[4]);
            const chart_num = dat[DATA_NUM].valueOf();
            Scope.addValue(chart_num, val);
            break;
        }
        case TT_CHART_DRAW:
            Scope.drawChart();
            break;
        case TT_CHART_CLEAR:
            Scope.startControlledDraw();
            break;
        case TT_CHART_LINE:
            const x1 = bytes_to_signed(dat[2], dat[3]);
            const y1 = bytes_to_signed(dat[4], dat[5]);
            const x2 = bytes_to_signed(dat[6], dat[7]);
            const y2 = bytes_to_signed(dat[8], dat[9]);
            const color = dat[10].valueOf();
            Scope.drawLine(x1, x2, y1, y2, color);

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
            str = convertBufferToString(dat, false);
            if (str === "NULL;NULL") {
                Misc.openUDConfig(udconfig);
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
        Menu.setBusState(busActive, busControllable, transientActive);
    }
}

function setTransientActive(active) {
    if (active !== transientActive) {
        transientActive = active;
        Menu.setBusState(busActive, busControllable, transientActive);
    }
}

function setBusControllable(controllable) {
    if (controllable !== busControllable) {
        busControllable = controllable;
        Menu.setBusState(busActive, busControllable, transientActive);
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
    const str = convertBufferToString(dat);
    Scope.drawText(x, y, color, size, str, center);
}

let buffer: number[] = [];
let bytes_done: number = 0;

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
                    Terminal.print(str);
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
