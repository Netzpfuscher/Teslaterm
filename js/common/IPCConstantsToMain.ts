export const IPCConstantsToMain = {
    connect: "connect-to-ud3",
    loadFile: "load-file",
    automaticCommand: "automatic_command",
    manualCommand: "manual_command",
    sliders: {
        setOntime: "slider-set-ontime",
        setBPS: "slider-set-bps",
        setBurstOntime: "slider-set-burst-ontime",
        setBurstOfftime: "slider-set-burst-offtime",
    },
    menu: {
        startScript: "start-script",
        stopScript: "stop-script",
        startMedia: "start-media",
        stopMedia: "stop-media",
        connectButton: "press-connect-button",
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
