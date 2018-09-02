class helper {
	static bytes_to_signed(lsb, msb){
		var sign = msb & (1 << 7);
		var x = (((msb & 0xFF) << 8) | (lsb & 0xFF));
		if (sign) {
			return  (0xFFFF0000 | x);  // fill in most significant bits with 1's
		}else{
			return  x;
		}
	}

	static convertArrayBufferToString(buf){
		var bufView = new Uint8Array(buf);
		var encodedString = String.fromCharCode.apply(null, bufView);
		var str = decodeURIComponent(encodedString);
		return str;
	}

	static convertStringToArrayBuffer(str) {
		var buf=new ArrayBuffer(str.length);
		var bufView=new Uint8Array(buf);
		for (var i=0; i<str.length; i++) {
			bufView[i]=str.charCodeAt(i);
		}
		return buf;
	}

	static delay(ms) {
		ms += new Date().getTime();
		while (new Date() < ms){}
	}

	static ascii_to_hex(str) {
		var arr1 = [];
		for (var n = 0, l = str.length; n < l; n ++) {
			var hex = Number(str.charCodeAt(n)).toString(16);
			arr1.push(hex);
			arr1.push(' ');
		}
	return arr1.join('');
   }

	static changeMenuEntry(menu, id, newName) {
		var items = $('#toolbar').w2toolbar().get(menu, false).items;
		for (var i = 0;i<items.length;i++) {
			console.log(items[i].id+" vs "+id);
			if (items[i].id==id) {
				items[i].text = newName;
				$('#toolbar').w2toolbar().set(menu, items);
				return;
			}
		}
		console.log("Didn't find name to replace!");
	}
}

class cls_meter {
	constructor(meters){
		this.num_meters=meters;
		this.meter_buf_old = [];
		this.meter_buf = [];
		this.g = [];

		for(var i=0;i<this.num_meters;i++){
			this.meter_buf_old[i]=255;
			this.meter_buf[i]=0;
			this.g[i]= new JustGage({
				id: ("gauge"+i),
				value: 255,
				min: 0,
				max: 255,
				title: ("Gauge"+i)
			});
		}

	}

	refresh_all(){
		for(var i=0;i<this.num_meters;i++){
			this.g[i].refresh(this.meter_buf[i]);
		}
	}

	refresh(){
		for(var i=0;i<this.num_meters;i++){
			if(this.meter_buf[i]!=this.meter_buf_old[i]){
				this.g[i].refresh(this.meter_buf[i]);
				this.meter_buf_old[i]=this.meter_buf[i];
			}
		}
	}

	value(num, value){
		if(num<this.num_meters){
			this.meter_buf[num] = value;
		}else{
			console.log('Meter: '+num+'not found');
		}
	}

	text(num,text){
		if(num<this.num_meters){
			this.g[num].refreshTitle(text);
		}else{
			console.log('Meter: '+num+'not found');
		}
	}

	range(num, min, max){
		if(num<this.num_meters){
			this.g[num].refresh(min,max);
		}else{
			console.log('Meter: '+num+'not found');
		}
	}
}


/**
 * Protocol:
 * When connecting, the server sends its name, afterwards the client sends its name.
 * Afterwards the first byte indicates type of message:
 * 'M': MIDI
 * 'C': Close connection
 * 'L': Loop detection
 */
class MidiIpServer {
	
	constructor(println, onStarted = ()=>{}, onClosed = ()=>{}) {
		this.println = println;
		this.setPort(5678);
		this.clients = {};
		this.active = false;
		this.onStarted = onStarted;
		this.onClosed = onClosed;
		chrome.sockets.tcpServer.onAccept.addListener(info=>this.onAccept(info));
	}

	//PUBLIC METHODS
	/**
	 * Sends `data` to all connected sockets that accept the data.
	 * Returns null if no socket fully accepts the data (see filter definition), `data` otherwise
	*/
	sendToAll(data) {
		if (typeof(data)==="string") {
			data = helper.convertStringToArrayBuffer(data);
		}
		var ret = data;
		for (let key in this.clients) {
			if (!this.clients.hasOwnProperty(key)) continue;
			//TODO check whether the socket accepts this data
			const client = this.clients[key];
			const keyConst = key;
			chrome.sockets.tcp.send(client.socketId, data, sendInfo => {
				if (sendInfo.resultCode<0) {
					this.println("TCP MIDI client \""+client.name+"\" disconnected!");
					delete this.clients[keyConst];
				}
			});
		}
		return ret;
	}

	sendMidiData(data) {
		if (!this.active) {
			return;
		}
		var buf=new ArrayBuffer(1+data.length);
		var bufView=new Uint8Array(buf);
		bufView[0] = "M".charCodeAt(0);
		for (var i=0; i<data.length; i++) {
			bufView[i+1]=data[i];
		}
		this.sendToAll(buf);
	}

	close() {
		chrome.sockets.tcpServer.disconnect(this.serverSocketId, ()=>this.onClosed());
		var data = helper.convertStringToArrayBuffer("C");
		for (let key in this.clients) {
			if (!this.clients.hasOwnProperty(key)) continue;
			//TODO check whether the socket accepts this data
			const client = this.clients[key];
			chrome.sockets.tcp.send(client.socketId, data, sendInfo => {
				if (sendInfo.resultCode>=0) {
					chrome.sockets.tcp.close(client.socketId, function (state){});
				}
			});
		}
		this.clients = {};
		this.active = false;
	}

	setPort(newPort) {
		var wasActive = this.active;
		if (wasActive) {
			close();
		}
		this.port = newPort;
		if (wasActive) {
			this.start();
		}
	}

	setName(newName) {
		this.ttName = newName;
		this.ttNameAsBuffer = helper.convertStringToArrayBuffer(this.ttName);
	}

	requestNameAnd(callback) {
		if (!this.ttName) {
			term_ui.inputString("Please enter a name for this TeslaTerm instance", "Enter name", (name) => {
				midiServer.setName(name);
				callback();
			});
		} else {
			callback();
		}
	}

	start() {
		chrome.sockets.tcpServer.create({}, info=>this.createCallback(info));
	}

	/**
	 * Parameter format:
	 * <first instance name>;<second instance name>;...
	 * Names are assumed to be unique
	 */
	loopTest(currentLoopString) {
		const previous = currentLoopString.split(';');
		let newLoopString;
		if (currentLoopString) {
			newLoopString = currentLoopString+";"+this.ttName;
		} else {
			newLoopString = this.ttName;
		}
		if (previous.length>0 && previous[0]==this.ttName) {
			let loopingName;
			if (previous.length==1) {// This instance is connected to itself
				loopingName = this.ttName;
			} else {// A "real" loop (non-leaf)
				loopingName = previous[1];
			}
			this.removeClient(loopingName, "The connection formed a loop ("+newLoopString+")");
		} else {
			this.sendToAll("L"+newLoopString);
		}
	}

	removeClient(name, reason) {
		const client = this.clients[name];
		const data = helper.convertStringToArrayBuffer("C"+reason);
		chrome.sockets.tcp.send(client.socketId, data, sendInfo => {
			chrome.sockets.tcp.close(client.socketId, function (state){});
			this.println("Removed client \""+name+"\". Reason: "+reason);
			delete this.clients[name];
		});
	}

	//INTERNAL USE ONLY!
	createCallback(createInfo) {
		var socketId = createInfo.socketId;
		chrome.sockets.tcpServer.listen(socketId,
			"127.0.0.1", this.port, resultCode=>this.onListenCallback(socketId, resultCode)
		);
	}

	onListenCallback(socketId, resultCode) {
		if (resultCode < 0) {
			this.println("Failed to start MIDI server at "+this.port+": "+chrome.runtime.lastError.message);
		} else {
			this.onStarted();
			this.active = true;
			this.serverSocketId = socketId;
		}
	}
	
	onAccept(info) {
		if (info.socketId != this.serverSocketId)
			return;

		// A new TCP connection has been established.
		chrome.sockets.tcp.send(info.clientSocketId, this.ttNameAsBuffer, result=>this.waitForClientName(result, info));
	}

	waitForClientName(resultCode, info) {
		var receiveListener = (recvInfo) => {
			if (recvInfo.socketId != info.clientSocketId)
				return;
			console.log(recvInfo.data);
			var remoteName = helper.convertArrayBufferToString(recvInfo.data);
			//TODO future format will be: <remoteName>\n<JSON defining filters. GUI TBD>
			this.println("Client instance \""+remoteName+"\" connected");
			chrome.sockets.tcp.setPaused(info.clientSocketId, true);
			chrome.sockets.tcp.onReceive.removeListener(receiveListener);
			this.clients[remoteName] = {socketId: info.clientSocketId, name: remoteName};//Object to make adding filter data later easier
			this.loopTest("");
		};
		chrome.sockets.tcp.onReceive.addListener(receiveListener);
		chrome.sockets.tcp.setPaused(info.clientSocketId, false);
	}
}
