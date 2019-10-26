import * as cmd from '../network/commands';
import * as connection from '../network/connection';
import * as midi from "../midi/midi";
import {loadMidiFile, loadSIDFile} from "../midi/midi_file";
import * as scripting from '../scripting';
import {setScript} from "./menu";
import {SidState} from "../midi/midi";
import * as nano from '../nano';
import * as gauges from './gauges';
export function init() {
    document.getElementById('layout').addEventListener("drop", ondrop);
    document.getElementById('layout').addEventListener("dragover", ondragover);
    terminal.onTerminalReady = function() {
        const io = terminal.io.push();

        terminal.processInput = cmd.sendCommand;
        io.onVTKeystroke = terminal.processInput;

        io.sendString = terminal.processInput;
    };
    gauges.init();
}

hterm.defaultStorage = new lib.Storage.Memory();

export let terminal: any = new hterm.Terminal();
export const MEAS_SPACE = 20;
export const INFO_SPACE = 150;
export const TOP_SPACE = 20;
export const TRIGGER_SPACE = 10;
export const CONTROL_SPACE = 15;
export const MEAS_POSITION = 4;

function ondrop(e){
    e.stopPropagation();
    e.preventDefault();
    if(e.dataTransfer.items.length == 1){//only one file
        midi.setSidState(SidState.none_loaded);
        const file = e.dataTransfer.files[0];
        const extension = file.name.substring(file.name.lastIndexOf(".")+1);
        if (extension==="mid"){
            loadMidiFile(file);
        } else if (extension=="js") {
            scripting.loadScript(file.path)
                .then((script)=> {
                    setScript(script);
                    w2ui['toolbar'].get('mnu_script').text = 'Script: '+file.name;
                    w2ui['toolbar'].refresh();
                })
                .catch((err)=>{
                    terminal.io.println("Failed to load script: "+err);
                    console.log(err);
                });
        }else if (extension=="dmp") {
            loadSIDFile(file);
        }
    }
}

function ondragover(e){
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
}