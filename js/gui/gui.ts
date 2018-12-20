import 'hterm';
import * as cmd from '../network/commands';
export let terminal: any = new Terminal();

export const MEAS_SPACE = 20;
export const INFO_SPACE = 150;
export const TOP_SPACE = 20;
export const TRIGGER_SPACE = 10;
export const CONTROL_SPACE = 15;
export const MEAS_POSITION = 4;

terminal.onTerminalReady = function() {
    const io = terminal.io.push();

    terminal.processInput = cmd.sendCommand;
    io.onVTKeystroke = terminal.processInput;

    io.sendString = terminal.processInput;
};