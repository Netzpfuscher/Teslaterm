import {IPCConstantsToMain} from "../../common/IPCConstantsToMain";
import {IPCConstantsToRenderer} from "../../common/IPCConstantsToRenderer";
import {commands, getUD3Connection, hasUD3Connection} from "../connection/connection";
import {receive_main} from "../connection/telemetry";
import {TerminalHandle} from "../connection/types/UD3Connection";
import {processIPC} from "./IPCProvider";

export module TerminalIPC {
    const buffers: Map<object, string> = new Map();
    export const terminals = new Map<object, TerminalHandle>();
    export const waitingConnections: object[] = [];

    export function print(s: string, target?: object) {
        let base: string = "";
        if (buffers.has(target)) {
            base = buffers.get(target);
        }
        buffers.set(target, base + s);
    }

    export function println(s: string, target?: object) {
        TerminalIPC.print(s + "\r\n", target);
    }

    function tick() {
        for (const [key, text] of buffers) {
            if (key) {
                processIPC.sendToWindow(IPCConstantsToRenderer.terminal, key, text);
            } else {
                processIPC.sendToAll(IPCConstantsToRenderer.terminal, text);
            }
        }
        buffers.clear();
    }

    export async function setupTerminal(source: object): Promise<boolean> {
        if (hasUD3Connection()) {
            const connection = getUD3Connection();
            const termID = connection.setupNewTerminal(d => {
                receive_main(d, source);
            });
            if (termID === undefined) {
                waitingConnections.push(source);
                return false;
            }
            processIPC.addDisconnectCallback(source, () => {
                if (terminals.has(source)) {
                    if (hasUD3Connection()) {
                        getUD3Connection().closeTerminal(terminals.get(source));
                    }
                    terminals.delete(source);
                }
            });
            terminals.set(source, termID);
            await connection.startTerminal(termID);
        }
        return true;
    }

    export function onConnectionClosed() {
        for (const source of terminals.keys()) {
            waitingConnections.push(source);
        }
        terminals.clear();
    }

    export async function onSlotsAvailable(sendExcuse: boolean) {
        while (waitingConnections.length > 0) {
            const newTerminal = waitingConnections.pop();
            if (!await setupTerminal(newTerminal)) {
                break;
            }
        }
        if (sendExcuse) {
            for (const target of waitingConnections) {
                TerminalIPC.println("No free terminal slot available. Will assign one when available.", target);
            }
        }
    }

    export function init() {
        processIPC.on(IPCConstantsToMain.manualCommand, (source: object, msg: string) => {
            if (hasUD3Connection() && terminals.has(source)) {
                getUD3Connection().sendTelnet(new Buffer(msg), terminals.get(source));
            }
        });
        processIPC.on(IPCConstantsToMain.automaticCommand, (source: object, cmd: string) => {
            commands.sendCommand(cmd);
        });
        setInterval(tick, 20);
    }
}
