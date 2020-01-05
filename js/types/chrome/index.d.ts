interface EventHandler {
    removeListener(listener: Function);

    addListener(listener: Function);
}

interface SocketCreationInfo {
    socketId: number;
}

declare namespace chrome.sockets.tcp {
    export const onReceive: EventHandler;

    export function send(id: number, data: number[] | Buffer | ArrayBuffer | Uint8Array, callback: Function);

    export function close(id: number, callback?: Function);

    export function setPaused(id: number, paused: boolean);

    export function create(options: Object, callback: (info: SocketCreationInfo) => void);

    export function connect(socketId: number, ip: string, port: number, callback: Function);

    export function disconnect(socketId: number, callback?: Function);

    export function getInfo(socketId: number, callback: Function);
}

declare namespace chrome.sockets.tcpServer {
    export const onAccept: EventHandler;

    export function disconnect(id: number, callback: Function);

    export function create(options: Object, callback: Function);//TODO is the first arg options?
    export function listen(socket: number, address: string, port: number, callback: Function);
}

declare namespace chrome.serial {
    export const onReceive: EventHandler;
    export const onReceiveError: EventHandler;

    export function send(id: number, data: number[] | Buffer | ArrayBuffer | Uint8Array, callback?: Function);

    export function disconnect(id: number, callback?: Function);

    export function connect(name: string, callback?: Function);

    export function getDevices(callback: Function);
}