export const IPCConstantsToMain = {
    connect: "connect-to-ud3",
    loadFile: "load-file",
    automaticCommand: "automatic-command",
    manualCommand: "manual-command",
    sliders: {
        setOntimeRelative: "slider-set-ontime-rel",
        setOntimeAbsolute: "slider-set-ontime-abs",
        setBPS: "slider-set-bps",
        setBurstOntime: "slider-set-burst-ontime",
        setBurstOfftime: "slider-set-burst-offtime",
    },
    menu: {
        startMedia: "start-media",
        stopMedia: "stop-media",
        connectButton: "press-connect-button",
        requestUDConfig: "ud-config",
    },
    script: {
        startScript: "start-script",
        stopScript: "stop-script",
        confirmOrDeny: "script-confirm",
    },
    rendererReady: "renderer-ready",
    midiMessage: "midi-message",
};

export class ConnectionReply {
    public readonly cancel: boolean;
    public readonly options: Object | null;

    constructor(cancel: boolean, options: Object | null) {
        this.cancel = cancel;
        this.options = options;
    }
}

export class TransmittedFile {
    public readonly name: string;
    public readonly contents: Uint8Array;

    constructor(name: string, contents: Uint8Array) {
        this.name = name;
        this.contents = contents;
    }
}

export class ConfirmReply {
    public readonly confirmed: boolean;
    public readonly requestID: number;

    constructor(confirmed: boolean, id: number) {
        this.confirmed = confirmed;
        this.requestID = id;
    }
}
