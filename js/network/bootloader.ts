import Timeout = NodeJS.Timeout;
import {connState, ipaddr} from "./connection";
import {ConnectionState, register_callback, remove_callback} from "./telemetry";
import {terminal} from "../gui/gui";
import {sendCommand} from "./commands";

class CyacdArray {
    data: string[];
    array_id: number[];
    row: number[];
    size: number[];
    byte: Uint8Array[];
    crc: number[];
    constructor() {
        this.data = [];
        this.array_id = [];
        this.row = [];
        this.size = [];
        this.byte = [];
        this.crc = [];
    }
}

const ENTER_BOOTLOADER = 0x38;
const PROGRAM = 0x39;
const DATA = 0x37;
const EXIT = 0x3B;

const PACKET_START = 0x01;
const PACKET_END = 0x17;

class Bootloader {
    connected: boolean;
    socket: number;
    last_command: number;
    chip_id: string;
    silicon_rev: string;
    ldr_version: string;
    ldr_conn: boolean;
    cyacd_file: string;
    cyacd_arr: CyacdArray;
    cyacd_chip_id: string;
    pc: number;
    time: Timeout;
    info_cb: (info: string) => void;
    progress_cb: (progress: number) => void;
    write_cb: (data: Uint8Array) => Promise<void>;
    receive_buffer: number[];
    byte_pos: number;
    chunk_size: number;

    constructor() {
        this.connected = undefined;//TODO talk to Jens about this
        this.socket=0;
        this.last_command=0x00;
        this.chip_id = '';
        this.silicon_rev = '';
        this.ldr_version = '';
        this.ldr_conn=false;
        this.cyacd_arr=new CyacdArray();
        this.cyacd_chip_id='';
        this.pc=0;
        this.info_cb=null;
        this.progress_cb=null;
        this.receive_buffer = [];
        this.byte_pos = 0;
        this.chunk_size = 32;
    }

    async on_read(data: Uint8Array){
        for(let i=0;i<data.length;i++){
            this.receive_buffer.push(data[i]);
            if(this.receive_buffer.length>6 && data[i] == PACKET_END){
                console.log(this.receive_buffer);
                let buf = new Uint8Array(this.receive_buffer);
                switch(this.last_command){
                    case ENTER_BOOTLOADER:
                        this.boot_decode_enter(buf);
                        console.log(this.chip_id);
                        break;
                    case PROGRAM:
                        if(buf[1]!=0) {
                            console.log('ERROR: Error at Row: ' + this.pc);
                        }else{
                            this.last_command=0x00;
                            await this.protmr();
                        }
                        break;
                    case DATA:
                        if(buf[1]!=0) {
                            console.log('ERROR: Error at Row: ' + this.pc);
                        }else{
                            this.last_command=0x00;
                            await this.protmr();
                        }
                        break;
                }
                this.receive_buffer=[];
                this.last_command=0x00;
            }
        }
    }

    async connect(){
        this.receive_buffer=[];
        await this.boot_cmd(ENTER_BOOTLOADER,[]);
    }


    set_progress_cb(cb_func){
        this.progress_cb=cb_func;
    }

    set_write_cb(cb_func){
        this.write_cb = cb_func;
    }

    set_info_cb(cb_func){
        this.info_cb=cb_func;
    }

    async cyacd(file){
        this.cyacd_file=file;
        let fs = new FileReader();
        const ret = new Promise((res, rej)=>{
            fs.onload = res;
        }).then((ev)=>{
            this.cyacd_loaded(ev).then();
        });
        fs.readAsText(file);
        await ret;
    }

    async programm(array, row, data){
        if(data.length==0) return;
        let buf = new Uint8Array(data.length+3);
        let cnt=3;
        buf[0] = array;
        buf[1] = row;
        buf[2] = row>>8;
        for(let i=0;i<data.length;i++){
            buf[cnt]=data[i];
            cnt++;
        }
        await this.boot_cmd(PROGRAM, buf);

    }

    send_info(str){
        if(this.info_cb==null) return;
        this.info_cb(str);
    }

    async cyacd_loaded(ev){

        this.cyacd_file = ev.srcElement.result.split('\n');
        this.cyacd_chip_id = this.cyacd_file[0].substr(0,8);
        let cnt=0;
        this.send_info('INFO: Cyacd loaded, found chip-ID: ' + this.cyacd_chip_id);

        if(this.connected==false){
            this.send_info('INFO: Not connected to bootloader... exit');
            return;
        }
        console.log('ID: ' + this.chip_id);

        if(this.cyacd_chip_id==this.chip_id){
            this.send_info('INFO: Chip-ID matches, start programming of flash');
        }else{
            this.send_info('INFO: Chip-ID match failed... exit');
            return;
        }


        for(let i=1;i<this.cyacd_file.length;i++) {
            if(this.cyacd_file[i]!='') {
                this.cyacd_arr.array_id[cnt] = parseInt(this.cyacd_file[i].substr(1, 2), 16);
                this.cyacd_arr.row[cnt] = parseInt(this.cyacd_file[i].substr(3, 4), 16);
                this.cyacd_arr.size[cnt] = parseInt(this.cyacd_file[i].substr(7, 4), 16);
                this.cyacd_arr.data[cnt] = this.cyacd_file[i].substring(11, this.cyacd_file[i].length-3);
                this.cyacd_arr.crc[cnt] = parseInt(this.cyacd_file[i].substring(this.cyacd_file[i].length-3, this.cyacd_file[i].length-1),16);
                let byte_arr = new Uint8Array(this.cyacd_arr.size[cnt]);
                let cnt_byte=0;
                for(let w=0;w<this.cyacd_arr.data[cnt].length;w+=2){
                    byte_arr[cnt_byte] = parseInt(this.cyacd_arr.data[cnt].substr(w, 2), 16);
                    cnt_byte++;
                }
                this.cyacd_arr.byte[cnt] = byte_arr;

            }
            cnt++;
        }
        this.pc=0;
        await this.protmr();
    }

    async protmr(){
        if(this.last_command!=0x00 && this.pc != 0){
            this.pc=0;
            this.send_info('\r\nERROR: Bootloader not responding');
            await this.boot_cmd(EXIT,[]);
            return;
        }

        if(this.pc==this.cyacd_arr.array_id.length){
            this.last_command=0x00;
            this.pc=0;
            this.send_info('\r\nINFO: Programming done');
            await this.boot_cmd(EXIT,[]);
            return;
        }
        let temp = this.cyacd_arr.byte[this.pc];
        const percent_done = Math.floor((100.0 / (this.cyacd_arr.array_id.length-1)) * this.pc);
        if(this.byte_pos<(temp.length-this.chunk_size)){
            let data = new Uint8Array(this.chunk_size);
            for(let i=0;i<this.chunk_size;i++){
                data[i] = temp[this.byte_pos];
                this.byte_pos++;
            }
            await this.boot_cmd(DATA, data);
        }else{


            let len=this.cyacd_arr.byte[this.pc].length-this.byte_pos;
            let data = new Uint8Array(len);
            for(let i=0;i<len;i++){
                data[i] = temp[this.byte_pos];
                this.byte_pos++;
            }

            await this.programm(this.cyacd_arr.array_id[this.pc], this.cyacd_arr.row[this.pc], data);
            this.byte_pos=0;
            this.pc++;
            this.progress_cb(percent_done);
        }


    }


    async boot_cmd(command , data){
        if(this.connected == false){
            return
        }
        let buffer = new Uint8Array(data.length+7);
        let sum = 0;
        buffer[0] = PACKET_START;
        buffer[1] = command;
        buffer[2] = data.length & 0xFF;
        buffer[3] = (data.length>>>8) & 0xFF;
        let dat_cnt = 4;
        for(let i=0;i<data.length;i++){
            buffer[dat_cnt] = data[i];
            dat_cnt++;
        }
        let size = buffer.length-3;
        while (size > 0)
        {
            sum += buffer[size - 1];
            size--;
        }

        let crc = (1 + (~sum)) & 0xFFFF;
        buffer[dat_cnt] = crc & 0xFF;
        dat_cnt++;
        buffer[dat_cnt] = (crc >>> 8) &0xFF;
        dat_cnt++;
        buffer[dat_cnt] = PACKET_END;
        this.last_command=command;
        await this.write_cb(buffer);
    }

    boot_decode_enter(buffer){
        if(buffer.length!=15) {
            console.log("Got boot info ", buffer);
            this.info_cb("Invalid boot info");
            return;
        }
        this.chip_id = (buffer[4] | (buffer[5]<<8) | (buffer[6]<<16) | (buffer[7]<<24)).toString(16).toUpperCase();
        this.silicon_rev = buffer[8].toString(16).toUpperCase();
        this.ldr_version = buffer[10].toString(10) +'.' + buffer[9].toString(10);

        this.send_info('\r\nINFO: Connected to bootloader chip-id: ' + this.chip_id + ' silicon-rev: ' + this.silicon_rev + ' bootloader version: ' + this.ldr_version);
    }
}

async function close_socket(socket: number) {
    return new Promise<SocketCreationInfo>((resolve, reject) => {
        chrome.sockets.tcp.close(socket, resolve);
    });
}
async function create_socket() {
    return new Promise<SocketCreationInfo>((resolve, reject) => {
        chrome.sockets.tcp.create({}, resolve);
    });
}
async function disconnect(socket: number) {
    return new Promise<SocketCreationInfo>((resolve, reject) => {
        chrome.sockets.tcp.disconnect(socket, resolve);
    });
}
async function connect(ipaddr: string, port: number, socket: number) {
    return new Promise<SocketCreationInfo>((resolve, reject) => {
        chrome.sockets.tcp.connect(socket, ipaddr, port, resolve);
    });
}
const sleep = require('util').promisify(setTimeout);
export async function loadCyacd(file: File): Promise<void> {
    if (connState!=ConnectionState.CONNECTED_IP) {
        terminal.io.println("Bootloader is only supported with IP connections");
        return;
    }
    sendCommand('\rbootloader\r');
    await sleep(100);
    const bootloader_socket = await create_socket();
    console.log("Bootloader socket is "+bootloader_socket.socketId);
    await connect(ipaddr, 666, bootloader_socket.socketId);
    const ldr = new Bootloader();
    ldr.set_info_cb((str: string) => terminal.io.println(str));
    ldr.set_progress_cb((info)=>{
        terminal.io.print('\x1B[2K');
        terminal.io.print('\r|');
        for(let i=0;i<50;i++){
            if(info.percent_done>=(i*2)){
                terminal.io.print('=');
            }else{
                terminal.io.print('.');
            }
        }
        terminal.io.print('| '+ info.percent_done + '%');
    });
    ldr.set_write_cb((data)=>{
        chrome.sockets.tcp.send(bootloader_socket.socketId, data, ()=>{});
        console.log("Sending", data);
    });
    register_callback(bootloader_socket.socketId, (data)=>{
        ldr.on_read(data).then();
        console.log("Received", data);
    });
    await ldr.connect();
    await ldr.cyacd(file);
    remove_callback(bootloader_socket.socketId);
    await disconnect(bootloader_socket.socketId);
    await close_socket(bootloader_socket.socketId);
}
