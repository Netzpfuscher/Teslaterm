import * as ini from "ini";
import * as fs from "fs";
import {terminal} from "./gui/constants";
import {convertArrayBufferToString} from "./helper";

const defaultUDConfigPages: { [prop: string]: number } = {
    offtime: 1,
    watchdog: 0,
    max_tr_pw: 1,
    max_tr_prf: 1,
    max_qcw_pw: 1,
    max_tr_current: 5,
    min_tr_current: 5,
    max_qcw_current: 5,
    temp1_max: 0,
    temp2_max: 0,
    ct1_ratio: 2,
    ct2_ratio: 2,
    ct3_ratio: 2,
    ct1_burden: 2,
    ct2_burden: 2,
    ct3_burden: 2,
    lead_time: 1,
    start_freq: 2,
    start_cycles: 2,
    max_tr_duty: 0,
    max_qcw_duty: 0,
    temp1_setpoint: 0,
    batt_lockout_v: 0,
    slr_fswitch: 0,
    slr_vbus: 0,
    ps_scheme: 0,
    autotune_s: 0,
    ud_name: 3,
    ip_addr: 3,
    ip_gateway: 3,
    ip_subnet: 3,
    ip_mac: 3,
    min_enable: 4,
    max_inst_i: 5,
    max_therm_i: 5,
    eth_hw: 3,
    ssid: 3,
    passwd: 3
};

export class TTConfig {
    // The type of connection to use for autoconnect: none, eth, min or serial
    public autoconnect: string;
    // Ethernet
    public remote_ip: string;
    public telnetPort: number;
    public midiPort: number;
    public sidPort: number;
    // Serial
    public serial_port: string;
    public baudrate: number;
    public productID: string;
    public vendorID: string;

    public udConfigPages: { [option: string]: number };

    public constructor(filename: string) {
        let contents: string = "";
        if (fs.existsSync(filename)) {
            contents = convertArrayBufferToString(fs.readFileSync(filename));
        }
        let iniObj: { [p: string]: any };
        iniObj = ini.parse(contents);
        let changed: { val: boolean } = {val: false};

        {
            let general = TTConfig.getOrCreateSection("general", iniObj);
            this.autoconnect = TTConfig.getOrWrite("autoconnect", "none", general, changed);
        }
        {
            let ethernet = TTConfig.getOrCreateSection("ethernet", iniObj);
            this.remote_ip = TTConfig.getOrWrite("remote_ip", "localhost", ethernet, changed);
            this.midiPort = TTConfig.getOrWrite("midiport", 12001, ethernet, changed);
            this.telnetPort = TTConfig.getOrWrite("telnetport", 2321, ethernet, changed);
            this.sidPort = TTConfig.getOrWrite("sidport", 6581, ethernet, changed);
        }
        {
            let serial = TTConfig.getOrCreateSection("serial", iniObj);
            this.serial_port = TTConfig.getOrWrite("port", "/dev/ttyUSB0", serial, changed);
            this.baudrate = TTConfig.getOrWrite("baudrate", 460_800, serial, changed);
            this.vendorID = TTConfig.getOrWrite("vendor_id", "1a86", serial, changed);
            this.productID = TTConfig.getOrWrite("product_id", "7523", serial, changed);
        }
        {
            let udconfig = TTConfig.getOrCreateSection("udconfig", iniObj);
            const allNames = Object.keys(defaultUDConfigPages).concat(Object.keys(udconfig));
            this.udConfigPages = {};
            for (const name of allNames) {
                this.udConfigPages[name] = TTConfig.getOrWrite(name, defaultUDConfigPages[name], udconfig, changed);
            }
        }
        if (changed.val) {
            fs.writeFile(filename, ini.stringify(iniObj), (err) => {
                if (err) {
                    terminal.io.println("Failed to write new config!");
                } else {
                    terminal.io.println("Successfully updated config");
                }
            });
        }
    }

    private static getOrCreateSection(name: string, config: { [k: string]: any }): { [k: string]: any } {
        if (!config.hasOwnProperty(name)) {
            config[name] = {};
        }
        return config[name] as { [k: string]: any };
    }

    private static getOrWrite<T>(
        key: string,
        defaultValue: T,
        config: { [option: string]: any },
        changed: { val: boolean }
    ): T {
        if (config.hasOwnProperty(key)) {
            const ret = config[key];
            if (typeof (defaultValue) === "number" && typeof (ret) === "string") {
                return parseInt(ret) as unknown as T;
            }
            return ret as T;
        } else {
            config[key] = defaultValue;
            changed.val = true;
            return defaultValue;
        }
    }
}
