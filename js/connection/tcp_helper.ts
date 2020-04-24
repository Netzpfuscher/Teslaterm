import * as net from "net";
import {terminal} from "../gui/constants";

export function connectTCPSocket(
    ipaddr: string,
    port: number,
    desc: string,
    dataCallback: (data: Buffer) => void,
): Promise<net.Socket> {
    return new Promise<net.Socket>((res, rej) => {
        const ret = net.createConnection({port, host: ipaddr}, (e) => {
            if (e) {
                console.error(e);
                rej();
            } else {
                terminal.io.println("Connected socket " + desc);
                res(ret);
            }
        });
        ret.on('end', () => {
            terminal.io.println("Socket " + desc + " disconnected");
        });
        ret.addListener('error', (e: Error) => {
            terminal.io.println("Error on " + desc + " socket!");
            console.error(e);
            rej();
        });
        ret.on('data', dataCallback);
    });
}

