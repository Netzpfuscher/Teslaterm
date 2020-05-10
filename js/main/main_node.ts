import {createServer, IncomingMessage, ServerResponse} from "http";
import {Socket} from "socket.io";
import * as url from "url";
import * as path from "path";
import * as fs from "fs";
import * as socket_io from "socket.io";
import {IPCProvider, setIPC} from "../common/IPCProvider";
import {init} from "./init";

class IPC implements IPCProvider {
    private readonly socket: Socket;

    constructor(socket: Socket) {
        this.socket = socket;
    }

    on(channel: string, callback: (...args: any[]) => void) {
        this.socket.on(channel, callback);
    }

    once(channel: string, callback: (...args: any[]) => void) {
        this.socket.once(channel, callback);
    }

    send(channel: string, ...args: any[]) {
        this.socket.emit(channel, ...args);
    }
}

const app = createServer(httpHandler);
const io = socket_io(app);
//TODO config
app.listen(2525);

//TODO multi-connection support
io.sockets.on('connection', (socket: Socket) => {
    console.log("New websocket connection from " + socket.id);
    setIPC(new IPC(socket));
    init();
});

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.ini': 'text/plain',
    '.js': 'text/javascript',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.eot': 'appliaction/vnd.ms-fontobject',
    '.ttf': 'aplication/font-sfnt',
    '.map': 'application/octet-stream',
};

function httpHandler(request: IncomingMessage, res: ServerResponse) {
    let pathName = url.parse(request.url).path;
    if (pathName === '/') {
        pathName = '/index_node.html';
    }
    pathName = pathName.substring(1, pathName.length);
    let extName = path.extname(pathName);
    //TODO only give access to the correct files
    console.log("Requested file ", pathName);
    let staticFiles = `${__dirname}/../../${pathName}`;

    if (extName === '.jpg' || extName === '.png' || extName === '.ico' || extName === '.eot' || extName === '.ttf' || extName === '.svg') {
        if (fs.existsSync(staticFiles)) {
            let file = fs.readFileSync(staticFiles);
            res.writeHead(200, {'Content-Type': mimeTypes[extName]});
            res.write(file, 'binary');
        } else {
            console.log('HTTP: File not Found: ' + staticFiles);
            res.writeHead(404, {'Content-Type': 'text/html;charset=utf8'});
            res.write(`<strong>${staticFiles}</strong>File is not found.`);
        }
        res.end();
    } else {
        fs.readFile(staticFiles, 'utf8', function(err, data) {
            if (!err) {
                res.writeHead(200, {'Content-Type': mimeTypes[extName]});
                res.end(data);
            } else {
                res.writeHead(404, {'Content-Type': 'text/html;charset=utf8'});
                res.write(`<strong>${staticFiles}</strong>File is not found.`);
            }
            res.end();
        });
    }
}
