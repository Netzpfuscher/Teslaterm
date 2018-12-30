import 'chrome';

interface EventHandler {
    removeListener(listener: Function);

    addListener(listener: Function);
}

interface TcpClient {
    onReceive: EventHandler;

    send(id: number, data: number[] | Buffer | ArrayBuffer | Uint8Array, callback?: Function);

    close(id: number, callback?: Function);

    setPaused(id: number, paused: boolean);

    create(options: Object, callback: Function);

    connect(socketId: number, ip: string, port: number, callback: Function);

    disconnect(socketId: number, callback?: Function);

    getInfo(socketId: number, callback: Function);
}

interface TcpServer {
    onAccept: EventHandler;

    disconnect(id: number, callback: Function);

    create(options: Object, callback: Function);//TODO is the first arg options?
    listen(socket: number, address: string, port: number, callback: Function);
}

interface Sockets {
    tcpServer: TcpServer;
    tcp: TcpClient;
}

interface Serial {
    onReceive: EventHandler;
    onReceiveError: EventHandler;

    send(id: number, data: number[] | Buffer | ArrayBuffer | Uint8Array, callback?: Function);

    disconnect(id: number, callback?: Function);

    connect(name: string, callback?: Function);

    getDevices(callback: Function);
}

export type Chrome = {
    sockets: Sockets;
    serial: Serial;
} & typeof chrome;