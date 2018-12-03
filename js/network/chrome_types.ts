export declare namespace chrome {
    interface EventHandler {
        removeListener(listener: Function);
        addListener(listener: Function);
    }

    interface TCP {
        onReceive: EventHandler;
        send(id: number, data: number[]|Buffer|ArrayBuffer|Uint8Array, callback: Function);
        close(id: number, callback: Function);
        setPaused(id: number, paused: boolean);
    }

    interface TCPServer {
        onAccept: EventHandler;
        disconnect(id: number, callback: Function);
        create(options: Object, callback: Function);//TODO is the first arg options?
        listen(socket: number, address: string, port: number, callback: Function);

    }

    interface Sockets {
        tcp: TCP;
        tcpServer: TCPServer;
    }

    interface LastError {
        message: string;
    }

    interface Serial {
        onReceive: EventHandler;
        onReceiveError: EventHandler;
    }
    export var sockets: Sockets;
    export var serial: Serial;
}