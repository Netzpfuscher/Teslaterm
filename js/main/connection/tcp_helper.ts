import * as net from "net";
import {Terminal} from "../ipc/terminal";

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
                Terminal.println("Connected socket " + desc);
                res(ret);
            }
        });
        ret.on('end', () => {
            Terminal.println("Socket " + desc + " disconnected");
        });
        ret.addListener('error', (e: Error) => {
            Terminal.println("Error on " + desc + " socket!");
            console.error(e);
            rej();
        });
        ret.on('data', dataCallback);
    });
}

