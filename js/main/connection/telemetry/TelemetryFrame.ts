import assert = require("assert");
import {
    DATA_NUM, DATA_TYPE,
    TT_CHART, TT_CHART_CLEAR,
    TT_CHART_CONF, TT_CHART_DRAW, TT_CHART_LINE, TT_CHART_TEXT, TT_CHART_TEXT_CENTER, TT_CONFIG_GET,
    TT_GAUGE,
    TT_GAUGE32,
    TT_GAUGE32_CONF,
    TT_GAUGE_CONF, TT_STATE_SYNC, UNITS
} from "../../../common/constants";
import {bytes_to_signed, convertBufferToString, Endianness, from_32_bit_bytes} from "../../helper";
import {MetersIPC} from "../../ipc/meters";
import {MiscIPC} from "../../ipc/Misc";
import {ScopeIPC} from "../../ipc/Scope";
import {setBusActive, setBusControllable, setTransientActive} from "./UD3State";

export let configRequestQueue: object[] = [];
let udconfig: string[][] = [];

export class TelemetryFrame {
    private readonly length: number;
    private readonly data: number[];

    constructor(length: number) {
        this.length = length;
        this.data = [];
    }

    public addByte(byte: number) {
        assert(!this.isFull());
        this.data.push(byte);
    }

    public isFull(): boolean {
        return this.data.length >= this.length;
    }

    public process(source: object) {
        let str: string;
        const type = this.data[DATA_TYPE];
        const num = this.data[DATA_NUM];
        switch (type) {
            case TT_GAUGE:
                MetersIPC.setValue(num, bytes_to_signed(this.data[2], this.data[3]));
                break;
            case TT_GAUGE32:
                MetersIPC.setValue(num, from_32_bit_bytes(this.data.slice(2), Endianness.LITTLE_ENDIAN));
                break;
            case TT_GAUGE_CONF: {
                const index = num;
                const gauge_min = bytes_to_signed(this.data[2], this.data[3]);
                const gauge_max = bytes_to_signed(this.data[4], this.data[5]);
                this.data.splice(0, 6);
                str = convertBufferToString(this.data);
                MetersIPC.configure(index, gauge_min, gauge_max, 1, str);
                ScopeIPC.refresh();
                break;
            }
            case TT_GAUGE32_CONF: {
                const index = num;
                const min = from_32_bit_bytes(this.data.slice(2, 6), Endianness.LITTLE_ENDIAN);
                const max = from_32_bit_bytes(this.data.slice(6, 10), Endianness.LITTLE_ENDIAN);
                const div = from_32_bit_bytes(this.data.slice(10, 14), Endianness.LITTLE_ENDIAN);
                this.data.splice(0, 14);
                str = convertBufferToString(this.data);
                MetersIPC.configure(index, min, max, div, str);
                ScopeIPC.refresh();
                break;
            }
            case TT_CHART_CONF: {
                const traceId = this.data[1].valueOf();
                const min = bytes_to_signed(this.data[2], this.data[3]);
                const max = bytes_to_signed(this.data[4], this.data[5]);
                const offset = bytes_to_signed(this.data[6], this.data[7]);
                const unit = UNITS[this.data[8]];
                this.data.splice(0, 9);
                const name = convertBufferToString(this.data);
                ScopeIPC.configure(traceId, min, max, offset, unit, name);
                break;
            }
            case TT_CHART: {
                const val = bytes_to_signed(this.data[2], this.data[3]);
                const chart_num = num.valueOf();
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
                const x1 = bytes_to_signed(this.data[1], this.data[2]);
                const y1 = bytes_to_signed(this.data[3], this.data[4]);
                const x2 = bytes_to_signed(this.data[5], this.data[6]);
                const y2 = bytes_to_signed(this.data[7], this.data[8]);
                const color = this.data[9].valueOf();
                ScopeIPC.drawLine(x1, y1, x2, y2, color, source);
                break;
            case TT_CHART_TEXT:
                drawString(this.data, false, source);
                break;
            case TT_CHART_TEXT_CENTER:
                drawString(this.data, true, source);
                break;
            case TT_STATE_SYNC:
                setBusActive((this.data[1] & 1) !== 0);
                setTransientActive((this.data[1] & 2) !== 0);
                setBusControllable((this.data[1] & 4) !== 0);
                break;
            case TT_CONFIG_GET:
                this.data.splice(0, 1);
                str = convertBufferToString(this.data, false);
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
}


function drawString(dat: number[], center: boolean, source?: object) {
    const x = bytes_to_signed(dat[1], dat[2]);
    const y = bytes_to_signed(dat[3], dat[4]);
    const color = dat[5].valueOf();
    let size = dat[6].valueOf();
    if (size < 6) {
        size = 6;
    }
    dat.splice(0, 7);
    const str = convertBufferToString(dat);
    ScopeIPC.drawText(x, y, color, size, str, center, source);
}

