/// <reference types="node" />
import 'chrome';
interface EventHandler {
    removeListener(listener: Function): any;
    addListener(listener: Function): any;
}
export declare namespace sockets.tcp {
    var onReceive: EventHandler;
    function send(id: number, data: number[] | Buffer | ArrayBuffer | Uint8Array, callback?: Function): any;
    function close(id: number, callback?: Function): any;
    function setPaused(id: number, paused: boolean): any;
    function create(options: Object, callback: Function): any;
    function connect(socketId: number, ip: string, port: number, callback: Function): any;
    function disconnect(socketId: number, callback?: Function): any;
    function getInfo(socketId: number, callback: Function): any;
}
export declare namespace sockets.tcpServer {
    var onAccept: EventHandler;
    function disconnect(id: number, callback: Function): any;
    function create(options: Object, callback: Function): any;
    function listen(socket: number, address: string, port: number, callback: Function): any;
}
export declare namespace serial {
    var onReceive: EventHandler;
    var onReceiveError: EventHandler;
    function send(id: number, data: number[] | Buffer | ArrayBuffer | Uint8Array, callback?: Function): any;
    function disconnect(id: number, callback?: Function): any;
    function connect(name: string, callback?: Function): any;
    function getDevices(callback: Function): any;
}
export declare const runtime: typeof chrome.runtime;
export {};
