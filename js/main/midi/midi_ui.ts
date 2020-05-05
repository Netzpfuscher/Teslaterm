import {getUD3Connection} from "../connection/connection";
import {
    midiIn,
    midiOut,
    setMidiInAsNone,
    setMidiInToPort,
    setMidiOut,
    stopMidiOutput,
} from "./midi";

//TODO this needs to move to the renderer
let selectMidiIn: HTMLSelectElement;
let selectMidiOut: HTMLSelectElement;

export function init() {
    return;//TODO
    selectMidiIn = (document.getElementById("midiIn") as HTMLSelectElement);
    selectMidiIn.onchange = onSelectMidiIn;
    selectMidiOut = (document.getElementById("midiOut") as HTMLSelectElement);
    selectMidiOut.onchange = onSelectMidiOut;
}

export function populateMIDISelects() {
    return;//TODO
    // clear the MIDI input select
    selectMidiIn.options.length = 0;

    addElementKeepingSelected("None", "", midiIn.source, selectMidiIn);
    //TODO
    //for (const input of midiAccess.inputs.values()) {
    //    const str = input.name.toString();
    //    const preferred = !midiIn.isActive() &&
    //        ((str.indexOf("Tesla") !== -1) || (str.toLowerCase().indexOf("keyboard") !== -1));
    //    addElementKeepingSelected(input.name, input.id, midiIn.source, selectMidiIn, preferred);
    //}
    onSelectMidiIn();
    selectMidiOut.options.length = 0;
    addElementKeepingSelected("UD3", "<Network>", midiOut.dest, selectMidiOut);
    //for (const output of midiAccess.outputs.values()) {
    //    const str = output.name;
    //    addElementKeepingSelected(str, output.id, midiOut.dest, selectMidiOut, str.indexOf("UD3") >= 0);
    //}
    onSelectMidiOut();
}

function onSelectMidiOut() {
    const selected = selectMidiOut.selectedIndex;
    const id = (selectMidiOut[selected] as HTMLOptionElement).value;
    if (id !== midiOut.dest) {
        stopMidiOutput();
        if (id === "<Network>") {
            setMidiOut({
                dest: id,
                send: (data) => getUD3Connection().sendMidi(data),
            });
        } else if (id) {
            //TODO
            //const midiSink = midiAccess.outputs.get(id);
            //setMidiOut({
            //    dest: id,
            //    send: (data) => midiSink.send(data as number[] | Uint8Array),
            //});
        } else {
            setMidiOut({
                dest: id,
                send: () => {
                },
            });
        }
        midiOut.dest = id;
    }
}

export function select(sel: number) {
    selectMidiIn.selectedIndex = sel;
}

function onSelectMidiIn() {
    const selected = selectMidiIn.selectedIndex;
    const id = (selectMidiIn[selected] as HTMLOptionElement).value;
    if (id !== midiIn.source) {
        if (midiIn.isActive()) {
            midiIn.cancel(null);
        }

        selectMidiIn.selectedIndex = selected;
        if (id) {
            //TODO
            //const midiSource = midiAccess.inputs.get(id);
            //setMidiInToPort(midiSource);
        } else {
            setMidiInAsNone();
        }
    }
}

function addElementKeepingSelected(name: string, id: string, oldId: string, selector: HTMLSelectElement, forceSelect: boolean = false) {
    const preferred = forceSelect || id === oldId;
    selector.appendChild(new Option(name, id, preferred, preferred));
}
