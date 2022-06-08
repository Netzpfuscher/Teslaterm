import * as os from "os";
import {
    connection_types,
    FEATURE_TIMEBASE,
    FEATURE_NOTELEMETRY,
    FEATURE_TIMECOUNT,
    FEATURE_MINSID
} from "../common/constants";
import {TTConfig} from "../common/TTConfig";
import {convertArrayBufferToString} from "./helper";
import {TerminalIPC} from "./ipc/terminal";
import * as fs from "fs";
import * as ini from "ini";

const defaultUDFeatures: Map<string, string> = new Map([
    ["protocol", "2.0"],
    ["build_time", ""],
    [FEATURE_TIMEBASE, "3.125"],
    [FEATURE_TIMECOUNT, "down"],
    [FEATURE_NOTELEMETRY, "0"],
    [FEATURE_MINSID, "0"],
]);

const defaultUDConfigPages: Map<string, number> = new Map([
    ["offtime", 1],
    ["watchdog", 0],
    ["max_tr_pw", 1],
    ["max_tr_prf", 1],
    ["max_qcw_pw", 1],
    ["max_tr_current", 5],
    ["min_tr_current", 5],
    ["max_qcw_current", 5],
    ["temp1_max", 6],
    ["temp2_max", 6],
    ["temp1_setpoint", 6],
    ["temp2_setpoint", 6],
    ["temp2_mode", 6],
    ["ct1_ratio", 2],
    ["ct2_ratio", 2],
    ["ct3_ratio", 2],
    ["ct1_burden", 2],
    ["ct2_burden", 2],
    ["ct3_burden", 2],
    ["ct2_type",2],
    ["max_fb_errors", 2],
    ["lead_time", 1],
    ["start_freq", 2],
    ["start_cycles", 2],
    ["max_tr_duty", 0],
    ["max_qcw_duty", 0],
    ["batt_lockout_v", 0],
    ["slr_fswitch", 0],
    ["slr_vbus", 0],
    ["ps_scheme", 0],
    ["autotune_s", 0],
    ["ud_name", 3],
    ["ip_addr", 3],
    ["ip_gateway", 3],
    ["ip_subnet", 3],
    ["ip_mac", 3],
    ["min_enable", 4],
    ["max_inst_i", 5],
    ["max_therm_i", 5],
    ["eth_hw", 3],
    ["ssid", 3],
    ["passwd", 3],
    ["vol_mod",7],
    ["synth_filter",7],
    ["ntc_b",6],
    ["ntc_r25",6],
    ["ntc_idac",6],
    ["max_dc_curr",5],
    ["pid_curr_p",5],
    ["pid_curr_i",5],
    ["max_const_i",5],
    ["max_fault_i",5],
]);


class ConfigEntry {
    public readonly value: any;
    public desc: string | undefined;

    constructor(value: any, desc?: string) {
        this.value = value;
        this.desc = desc;
    }
}

class ConfigSection {
    public readonly contents: Map<string, ConfigEntry>;
    public desc: string | undefined;

    constructor(desc?: string) {
        this.contents = new Map<string, ConfigEntry>();
        this.desc = desc;
    }

    public getOrWrite<T>(
        key: string,
        defaultValue: T,
        changed: { val: boolean },
        description?: string,
    ): T {
        if (this.contents.has(key)) {
            const retEntry = this.contents.get(key);
            retEntry.desc = description;
            const ret = retEntry.value;
            if (typeof (defaultValue) === "number" && typeof (ret) === "string") {
                return parseInt(ret) as unknown as T;
            } else if (typeof (defaultValue) === "boolean" && typeof (ret) === "string") {
                return (ret === "true") as unknown as T;
            } else {
                return ret as T;
            }
        } else {
            this.contents.set(key, new ConfigEntry(defaultValue, description));
            changed.val = true;
            return defaultValue;
        }
    }
}

class Config {
    public readonly contents: Map<string, ConfigSection>;

    constructor() {
        this.contents = new Map<string, ConfigSection>();
    }

    public get(section: string, entry: string): ConfigEntry {
        return this.contents.get(section).contents.get(entry);
    }

    public getOrCreateSection(name: string, desc?: string): ConfigSection {
        if (!this.contents.has(name)) {
            this.contents.set(name, new ConfigSection());
        }
        const ret = this.contents.get(name);
        ret.desc = desc;
        return ret;
    }
}

export function loadConfig(filename: string): TTConfig {
    let ret = new TTConfig();
    let contents: string = "";
    if (fs.existsSync(filename)) {
        contents = convertArrayBufferToString(fs.readFileSync(filename));
    }
    let config = configFromString(contents);
    let changed: { val: boolean } = {val: false};

    {
        const general = config.getOrCreateSection("general");
        const types = Array.from(connection_types.keys());
        ret.autoconnect = general.getOrWrite(
            "autoconnect",
            "none",
            changed,
            "One of \"" + types.join("\", \"") + "\" or \"none\""
        );
    }
    {
        const ethernet = config.getOrCreateSection(
            "ethernet",
            "Default settings for ethernet connections to UD3 node instances"
        );
        ret.ethernet.remote_ip = ethernet.getOrWrite("remote_ip", "localhost", changed);
        ret.ethernet.midiPort = ethernet.getOrWrite("midiport", 12001, changed,
            "Default remove port for RTP midi");
        ret.ethernet.telnetPort = ethernet.getOrWrite("telnetport", 2321, changed,
            "Default remote port for telnet and telemetry");
        ret.ethernet.sidPort = ethernet.getOrWrite("sidport", 6581, changed,
            "Default remote port for netSID");
        //TODO discuss default value?
        ret.ethernet.udpMinPort = ethernet.getOrWrite("udpMinPort", 1234, changed,
            "Default remote port for MIN connections over UDP");
    }
    {
        const serial = config.getOrCreateSection("serial", "Default settings for serial connections (plain or MIN)");
        let defaultPort: string;
        if (os.platform() === "win32") {
            defaultPort = "COM1";
        } else {
            defaultPort = "/dev/ttyUSB0";
        }
        ret.serial.serial_port = serial.getOrWrite("port", defaultPort, changed);
        ret.serial.baudrate = serial.getOrWrite("baudrate", 460_800, changed);
        ret.serial.vendorID = serial.getOrWrite("vendor_id", "1a86", changed);
        ret.serial.productID = serial.getOrWrite("product_id", "7523", changed);
    }
    {
        const rtpmidi = config.getOrCreateSection("rtpmidi", "Settings for the RTP-MIDI server hosted by Teslaterm/UD3-node");
        ret.midi.runMidiServer = rtpmidi.getOrWrite("enabled", true, changed);
        ret.midi.port = rtpmidi.getOrWrite("port", 12001, changed);
        ret.midi.localName = rtpmidi.getOrWrite("localName", "Teslaterm", changed);
        ret.midi.bonjourName = rtpmidi.getOrWrite("bonjourName", "Teslaterm", changed);
    }
    {
        const netsid = config.getOrCreateSection("netsid", "Settings for the NetSID server hosted by Teslaterm/UD3-node");
        ret.netsid.enabled = netsid.getOrWrite("enabled", true, changed);
        ret.netsid.port = netsid.getOrWrite("port", 6581, changed);
    }
    {
        // TODO document
        const command = config.getOrCreateSection("command", "");
        ret.command.state = command.getOrWrite("state", "disable", changed, "Possible values: disable, server, client");
        ret.command.port = command.getOrWrite("port", 13001, changed);
        ret.command.remoteName = command.getOrWrite("remoteName", "localhost", changed);
    }
    {
        const udconfig = config.getOrCreateSection(
            "udconfig",
            "Each entry indicates which page the corresponding UD3 option should be shown on in the UD3 config GUI"
        );
        setSectionFromMap(
            defaultUDConfigPages,
            ret.udConfigPages,
            udconfig,
            changed
        );
    }
    {
        let udFeaturesInConfig = config.getOrCreateSection(
            "defaultUDFeatures",
            "Default values for features of the UD3. These values will only be used if the UD3 does not specify " +
            "the correct values to use."
        );
        setSectionFromMap(
            defaultUDFeatures,
            ret.defaultUDFeatures,
            udFeaturesInConfig,
            changed
        );
    }
    fs.writeFile(filename, configToString(config), (err) => {
        if (err) {
            TerminalIPC.println("Failed to write new config!");
        } else {
            TerminalIPC.println("Successfully updated config");
        }
    });
    return ret;
}

function setSectionFromMap(defaults: Map<string, any>, output: Map<string, any>, section: ConfigSection, changed: { val: boolean }) {
    const allNames = new Set<string>(defaults.keys());
    for (const key of section.contents.keys()) {
        allNames.add(key);
    }
    output.clear();
    for (const name of allNames) {
        output.set(name, section.getOrWrite(name, defaults.get(name), changed));
    }
}

function configFromString(contents: string): Config {
    let ret = new Config();
    const iniData = ini.parse(contents);
    for (const [key, value] of Object.entries(iniData)) {
        let section = new ConfigSection();
        for (const [subKey, subValue] of Object.entries(value)) {
            section.contents.set(subKey, new ConfigEntry(subValue));
        }
        ret.contents.set(key, section);
    }
    return ret;
}

function configToString(config: Config): string {
    let configObject = {};
    for (const [key, section] of config.contents.entries()) {
        let sectionObject = {};
        for (const [sectionKey, value] of section.contents.entries()) {
            sectionObject[sectionKey] = value.value;
        }
        configObject[key] = sectionObject;
    }
    const iniString = ini.stringify(configObject);
    const iniLines = iniString.split(/\r?\n/);
    let resultLines = [];
    let currentSection: string | undefined = undefined;
    for (const iniLine of iniLines) {
        const sectionMatch = /\[(.*)]/.exec(iniLine);
        let comment: string | undefined = undefined;
        if (sectionMatch !== null) {
            currentSection = sectionMatch[1];
            comment = config.contents.get(currentSection).desc;
        } else {
            const entryMatch = /(\S*)=\S*/.exec(iniLine);
            if (entryMatch !== null) {
                const currentEntry = entryMatch[1];
                const configEntry = config.get(currentSection, currentEntry);
                comment = configEntry.desc;
            }
        }
        if (comment) {
            resultLines.push(";" + comment);
        }
        resultLines.push(iniLine);
    }
    return resultLines.join(os.EOL);
}
