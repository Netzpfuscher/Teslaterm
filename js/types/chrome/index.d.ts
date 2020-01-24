interface EventHandler {
    removeListener(listener: Function);

    addListener(listener: Function);
}

interface SendResult {
    resultCode: number;
    bytesSent?: number;
}

interface CreateResult {
    socketId: number;
}

declare namespace chrome.sockets.tcp {
    import SocketInfo = chrome.socket.SocketInfo;
    export const onReceive: EventHandler;

    export function send(id: number, data: number[] | Buffer | ArrayBuffer | Uint8Array, callback: (info: SendResult) => void);

    export function close(id: number, callback?: () => void);

    export function setPaused(id: number, paused: boolean);

    export function create(options: Object, callback: (info: CreateResult) => void);

    export function connect(socketId: number, ip: string, port: number, callback: (info: number) => void);

    export function disconnect(socketId: number, callback?: () => void);

    export function getInfo(socketId: number, callback: (info: SocketInfo) => void);
}

declare namespace chrome.sockets.tcpServer {
    export const onAccept: EventHandler;

    export function disconnect(id: number, callback?: () => void);

    export function create(options: Object, callback: (info: CreateResult) => void);

    export function listen(socket: number, address: string, port: number, callback: (result: number) => void);
}

declare namespace chrome.serial {
    export const onReceive: EventHandler;
    export const onReceiveError: EventHandler;

    interface SendResult {
        bytesSent: number;
        error?: "disconnected" | "pending" | "timeout" | "system_error";
    }

    interface ConnectionInfo {
        //TODO
    }

    interface Port {
        path: string;
        vendorId?: number;
        productId?: number;
        displayName?: string;
    }

    export function send(id: number, data: number[] | Buffer | ArrayBuffer | Uint8Array, callback: (result: SendResult) => void);

    export function disconnect(id: number, callback: (result: boolean) => void);

    export function connect(name: string, callback: (info: ConnectionInfo) => void);

    export function getDevices(callback: (ports: Port[]) => void);
}
