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
    TT_GAUGE32,
    TT_GAUGE32_CONF,
    TT_GAUGE_CONF,
    TT_STATE_SYNC,
    UNITS,
} from "../../common/constants";
import {bytes_to_signed, convertBufferToString, Endianness, from_32_bit_bytes} from '../helper';
import {MenuIPC} from "../ipc/Menu";
import {MetersIPC} from "../ipc/meters";
import {MiscIPC} from "../ipc/Misc";
import {ScopeIPC} from "../ipc/Scope";
import {TerminalIPC} from "../ipc/terminal";
import {resetResponseTimeout} from "./state/Connected";


export let busActive: boolean = false;
export let busControllable: boolean = false;
export let transientActive: boolean = false;
export let configRequestQueue: object[] = [];

let udconfig: string[][] = [];

function compute(dat: number[], source?: object) {
    let str: string;
    switch (dat[DATA_TYPE]) {
        case TT_GAUGE:
            MetersIPC.setValue(dat[DATA_NUM], bytes_to_signed(dat[3], dat[4]));
            break;
        case TT_GAUGE32:
            MetersIPC.setValue(dat[DATA_NUM], from_32_bit_bytes(dat.slice(3), Endianness.LITTLE_ENDIAN));
            break;
        case TT_GAUGE_CONF: {
            const index = dat[DATA_NUM];
            const gauge_min = bytes_to_signed(dat[3], dat[4]);
            const gauge_max = bytes_to_signed(dat[5], dat[6]);
            dat.splice(0, 7);
            str = convertBufferToString(dat);
            MetersIPC.configure(index, gauge_min, gauge_max, 1, str);
            ScopeIPC.refresh();
            break;
        }
        case TT_GAUGE32_CONF: {
            const index = dat[DATA_NUM];
            const min = from_32_bit_bytes(dat.slice(3, 7), Endianness.LITTLE_ENDIAN);
            const max = from_32_bit_bytes(dat.slice(7, 11), Endianness.LITTLE_ENDIAN);
            const div = from_32_bit_bytes(dat.slice(11, 15), Endianness.LITTLE_ENDIAN);
            dat.splice(0, 15);
            str = convertBufferToString(dat);
            MetersIPC.configure(index, min, max, div, str);
            ScopeIPC.refresh();
            break;
        }
        case TT_CHART_CONF: {
            const traceId = dat[2].valueOf();
            const min = bytes_to_signed(dat[3], dat[4]);
            const max = bytes_to_signed(dat[5], dat[6]);
            const offset = bytes_to_signed(dat[7], dat[8]);
            const unit = UNITS[dat[9]];
            dat.splice(0, 10);
            const name = convertBufferToString(dat);
            ScopeIPC.configure(traceId, min, max, offset, unit, name);
            break;
        }
        case TT_CHART: {
            const val = bytes_to_signed(dat[3], dat[4]);
            const chart_num = dat[DATA_NUM].valueOf();
            ScopeIPC.addValue(chart_num, val);
            break;
        }
        case TT_CHART_DRAW:
            ScopeIPC.drawChart();
            break;
        case TT_CHART_CLEAR:
            ScopeIPC.startControlledDraw(source);
            break;
        case TT_CHART_LINE:
            const x1 = bytes_to_signed(dat[2], dat[3]);
            const y1 = bytes_to_signed(dat[4], dat[5]);
            const x2 = bytes_to_signed(dat[6], dat[7]);
            const y2 = bytes_to_signed(dat[8], dat[9]);
            const color = dat[10].valueOf();
            ScopeIPC.drawLine(x1, y1, x2, y2, color, source);

            break;
        case TT_CHART_TEXT:
            drawString(dat, false, source);
            break;
        case TT_CHART_TEXT_CENTER:
            drawString(dat, true, source);
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
                if (!source && configRequestQueue.length > 0) {
                    source = configRequestQueue.shift();
                }
                if (source) {
                    MiscIPC.openUDConfig(udconfig, source);
                }
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
        MenuIPC.setUD3State(busActive, busControllable, transientActive);
    }
}

function setTransientActive(active) {
    if (active !== transientActive) {
        transientActive = active;
        MenuIPC.setUD3State(busActive, busControllable, transientActive);
    }
}

function setBusControllable(controllable) {
    if (controllable !== busControllable) {
        busControllable = controllable;
        MenuIPC.setUD3State(busActive, busControllable, transientActive);
    }
}

function drawString(dat: number[], center: boolean, source?: object) {
    const x = bytes_to_signed(dat[2], dat[3]);
    const y = bytes_to_signed(dat[4], dat[5]);
    const color = dat[6].valueOf();
    let size = dat[7].valueOf();
    if (size < 6) {
        size = 6;
    }
    dat.splice(0, 8);
    const str = convertBufferToString(dat);
    ScopeIPC.drawText(x, y, color, size, str, center, source);
}

enum TelemetryFrameState {
    idle,
    frame,
    collect
}

let buffers: Map<object, number[]> = new Map();
let term_states: Map<Object, TelemetryFrameState> = new Map();
let bytes_done: number = 0;
let consoleLine: string = "";

export function receive_main(data: Buffer, source?: object) {
    const buf = new Uint8Array(data);
    resetResponseTimeout();
    if (!buffers.has(source)) {
        buffers.set(source, []);
    }
    if (!term_states.has(source)) {
        term_states.set(source, TelemetryFrameState.idle);
    }

    for (const byte of buf) {
        const buffer = buffers.get(source);
        const state = term_states.get(source);
        switch (state) {
            case TelemetryFrameState.idle:
                if (byte === 0xff) {
                    term_states.set(source, TelemetryFrameState.frame);
                } else {
                    const asString = String.fromCharCode(byte);
                    if (source) {
                        TerminalIPC.print(asString, source);
                    } else if (asString === '\n' || asString === '\r') {
                        if (consoleLine !== "") {
                            console.log(consoleLine);
                            consoleLine = "";
                        }
                    } else {
                        consoleLine += asString;
                    }
                }
                break;
            case TelemetryFrameState.frame:
                buffer[DATA_LEN] = byte;
                bytes_done = 0;
                term_states.set(source, TelemetryFrameState.collect);
                break;
            case TelemetryFrameState.collect:
                if (bytes_done === 0) {
                    buffer[0] = byte;
                    bytes_done++;
                } else {
                    buffer[bytes_done + 1] = byte;
                    bytes_done++;
                    if (bytes_done >= buffer[DATA_LEN]) {
                        bytes_done = 0;
                        term_states.set(source, TelemetryFrameState.idle);
                        buffers.set(source, []);
                        compute(buffer, source);
                    }
                }
                break;
        }
    }
}
