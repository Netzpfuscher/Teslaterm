import 'chrome';

interface EventHandler {
    removeListener(listener: Function);

    addListener(listener: Function);
}

export declare namespace sockets.tcp {
    export var onReceive: EventHandler;

    export function send(id: number, data: number[] | Buffer | ArrayBuffer | Uint8Array, callback?: Function);

    export function close(id: number, callback: Function);

    export function setPaused(id: number, paused: boolean);

    export function create(options: Object, callback: Function);

    export function connect(socketId: number, ip: string, port: number, callback: Function);
}

export declare namespace sockets.tcpServer {
    export var onAccept: EventHandler;

    export function disconnect(id: number, callback: Function);

    export function create(options: Object, callback: Function);//TODO is the first arg options?
    export function listen(socket: number, address: string, port: number, callback: Function);

}

export declare namespace serial {
    export var onReceive: EventHandler;
    export var onReceiveError: EventHandler;

    export function send(id: number, data: number[] | Buffer | ArrayBuffer | Uint8Array, callback?: Function);
}

export const runtime = chrome.runtime;