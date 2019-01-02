class helper {
	static bytes_to_signed(lsb, msb){
		let sign = msb & (1 << 7);
		let x = (((msb & 0xFF) << 8) | (lsb & 0xFF));
		if (sign) {
			return  (0xFFFF0000 | x);  // fill in most significant bits with 1's
		}else{
			return  x;
		}
	}

	static convertArrayBufferToString(buf, uri = true){
		let bufView = new Uint8Array(buf);
		let encodedString = String.fromCharCode.apply(null, bufView);
		if (uri) {
			return decodeURIComponent(encodedString);
		} else {
			return encodedString;
		}
	}

	static convertStringToArrayBuffer(str) {
		let buf=new ArrayBuffer(str.length);
		let bufView=new Uint8Array(buf);
		for (let i=0; i<str.length; i++) {
			bufView[i]=str.charCodeAt(i);
		}
		return buf;
	}

	static ascii_to_hex(str) {
		let arr1 = [];
		for (let n = 0, l = str.length; n < l; n ++) {
			let hex = Number(str.charCodeAt(n)).toString(16);
			arr1.push(hex);
			arr1.push(' ');
		}
	return arr1.join('');
   }

	static changeMenuEntry(menu, id, newName) {
		let items = $('#toolbar').w2toolbar().get(menu, false).items;
		for (let i = 0;i<items.length;i++) {
			if (items[i].id==id) {
				items[i].text = newName;
				$('#toolbar').w2toolbar().set(menu, items);
				return;
			}
		}
		console.log("Didn't find name to replace!");
	}

	static parseFilter(str) {
		if (str=="") {
			return [];
		}
		if (!/^(\d+(-\d+)?)(,\d+(-\d+)?)*$/.test(str)) {
			return null;
		}
		let ret = [];
		const sections = str.split(",");
		for (let i = 0;i<sections.length;i++) {
			const bounds = sections[i].split("-");
			if (bounds.length<2) {
				const bound = parseInt(bounds[0]);
				ret.push([bound, bound]);
			} else {
				const lower = parseInt(bounds[0]);
				const upper = parseInt(bounds[1]);
				if (lower>upper) {
					return null;
				}
				ret.push([lower, upper]);
			}
		}
		return ret;
	}

	static matchesFilter(filter, num) {
		for (let i = 0;i<filter.length;i++) {
			if (filter[i][0]<=num && num<=filter[i][1]) {
				return true;
			}
		}
		return false;
	}

	static addFirstMenuEntry(menu, id, text, icon) {
		const mnu = $('#toolbar').w2toolbar().get(menu, false);
		mnu.items = [{text: text, icon: icon, id: id}].concat(mnu.items);
	}

	static removeMenuEntry(menu, id) {
		const mnu = $('#toolbar').w2toolbar().get(menu, false);
		let items = mnu.items;
		for (let i = 0;i<items.length;i++) {
			if (items[i].id==id) {
				mnu.items.splice(i, 1);
				return;
			}
		}
		console.log("Didn't find name to remove!");
	}
}

class cls_meter {
	constructor(meters){
		this.num_meters=meters;
		this.meter_buf_old = [];
		this.meter_buf = [];
		this.g = [];

		for(let i=0;i<this.num_meters;i++){
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
		for(let i=0;i<this.num_meters;i++){
			this.g[i].refresh(this.meter_buf[i]);
		}
	}

	refresh(){
		for(let i=0;i<this.num_meters;i++){
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
 * 'O': Set relative ontime
 */
class MidiIpServer {
	
	constructor(println, onStarted = ()=>{}, onClosed = ()=>{}, onConnected = (client)=>{}) {
		this.println = println;
		this.setPort(5678);
		this.clients = {};
		this.clientsBySocket = {};
		this.active = false;
		this.onStarted = onStarted;
		this.onClosed = onClosed;
		this.onConnected = onConnected;
		chrome.sockets.tcpServer.onAccept.addListener(info=>this.onAccept(info));
		chrome.sockets.tcp.onReceive.addListener(args=>this.onMessage(args.socketId, args.data));
	}

	//PUBLIC METHODS
	/**
	 * Sends `data` to all connected sockets that accept the data.
	*/
	sendToAll(data) {
		if (typeof(data)==="string") {
			data = helper.convertStringToArrayBuffer(data);
		}
		for (let key in this.clients) {
			if (!this.clients.hasOwnProperty(key)) continue;
			this.sendToClient(this.clients[key], data)
		}
	}

	sendMidiData(data) {
		if (!this.active) {
			return false;
		}
		const buf=new ArrayBuffer(1+data.length);
		const bufView=new Uint8Array(buf);
		bufView[0] = "M".charCodeAt(0);
		for (var i=0; i<data.length; i++) {
			bufView[i+1]=data[i];
		}
		let accepted = false;
		for (let key in this.clients) {
			if (!this.clients.hasOwnProperty(key)) continue;
			const client = this.clients[key];
			const result = MidiIpServer.matchesFilter(data, client.filter);
			if (result!=0) {
				this.sendToClient(client, bufView);
				if (result>0) {
					accepted = true;
				}
			}
		}
		return accepted;
	}

	sendToClient(client, data) {
		chrome.sockets.tcp.send(client.socketId, data, sendInfo => {
			if (sendInfo.resultCode < 0) {
				this.deleteClient(client);
			}
		});
	}

	close() {
		chrome.sockets.tcpServer.disconnect(this.serverSocketId, ()=>this.onClosed());
		var data = helper.convertStringToArrayBuffer("C");
		for (let key in this.clients) {
			if (!this.clients.hasOwnProperty(key)) continue;
			const client = this.clients[key];
			chrome.sockets.tcp.send(client.socketId, data, sendInfo => {
				if (sendInfo.resultCode>=0) {
					chrome.sockets.tcp.close(client.socketId, function (state){});
				}
			});
		}
		this.clients = {};
		this.clientsBySocket = {};
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
		document.title = "Teslaterm: "+name;
	}

	requestName() {
		if (!this.ttName) {
			return term_ui.inputStrings("Please enter a name for this TeslaTerm instance", "Enter name", (name) => {
				if ($.trim(name)=='') {
					return 0;
				}
				for (let i = 0;i<name.length;i++) {
					if (name[i]==';') {
						return 0;
					}
				}
				return -1;
			}, ["Name"]).then((name)=>{
				this.setName(name);
				return Promise.resolve();
			});
		} else {
			return Promise.resolve();
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
			this.deleteClient(client, reason);
		});
	}

	sendRelativeOntime(percentage, client = undefined) {
		if (!this.active) {
			return;
		}
		let data = new ArrayBuffer(2);
		let dataView = new Uint8Array(data);
		dataView[0] = 'O'.charCodeAt(0);
		dataView[1] = percentage;//Always between 0 and 100
		if (client) {
			this.sendToClient(client, data);
		} else {
			this.sendToAll(data);
		}
	}

	static matchesFilter(data, filter) {
		var channel = undefined;
		var note = undefined;
		switch (data[0] & 0xF0) {
			case 0x80:
			case 0x90:
			case 0xA0:
				channel = data[0] & 0x0F;
				note = data[1] & 0x7F;
				break;
			case 0xB0:
			case 0xC0:
			case 0xD0:
			case 0xE0:
				channel = data[0] & 0x0F;
				break;
			default:
				return -1;
		}
		return this.matchesFilterExtracted(filter, channel, note);
	}

	//INTERNAL USE ONLY!
	createCallback(createInfo) {
		var socketId = createInfo.socketId;
		chrome.sockets.tcpServer.listen(socketId,
			"127.0.0.1", this.port, resultCode => this.onListenCallback(socketId, resultCode)
		);
	}

	onListenCallback(socketId, resultCode) {
		if (resultCode < 0) {
			this.println("Failed to start MIDI server at " + this.port + ": " + chrome.runtime.lastError.message);
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
		chrome.sockets.tcp.send(info.clientSocketId, this.ttNameAsBuffer, result => this.waitForClientName(result, info));
	}

	waitForClientName(resultCode, info) {
		var receiveListener = (recvInfo) => {
			if (recvInfo.socketId != info.clientSocketId)
				return;
			console.log(recvInfo.data);
			var data = helper.convertArrayBufferToString(recvInfo.data);
			const remoteName = data.substring(0, data.indexOf(';'));
			const filterString = data.substring(data.indexOf(';') + 1);
			const filter = JSON.parse(filterString);
			chrome.sockets.tcp.setPaused(info.clientSocketId, true);
			chrome.sockets.tcp.onReceive.removeListener(receiveListener);
			const client = {socketId: info.clientSocketId, name: remoteName, filter: filter};
			this.addClient(client);//Object to make adding filter data later easier
			this.loopTest("");
			this.onConnected(client);
		};
		chrome.sockets.tcp.onReceive.addListener(receiveListener);
		chrome.sockets.tcp.setPaused(info.clientSocketId, false);
	}

	onMessage(socketId, data) {
		const client = this.clientsBySocket[socketId];
		if (client) {
			const firstByte = new Uint8Array(data)[0];
			if (firstByte == 'C'.charCodeAt(0)) {
				this.deleteClient(client);
			}
		}
	}

	deleteClient(client, reason = null) {
		if (reason) {
			this.println("Removed TCP MIDI client \"" + client.name + "\". Reason: " + reason);
		} else {
			this.println("TCP MIDI client \"" + client.name + "\" disconnected!");
		}
		delete this.clients[client.name];
		delete this.clientsBySocket[client.socketId];
	}

	addClient(client) {
		this.clients[client.name] = client;
		this.clientsBySocket[client.socketId] = client;
	}

	static matchesFilterExtracted(filter, channel, note) {
		let resultChannel;
		if (filter.channel.length == 0 || channel == undefined) {
			resultChannel = true;
		} else {
			resultChannel = helper.matchesFilter(filter.channel, channel);
		}
		let resultNote;
		if (filter.note.length == 0 || note == undefined) {
			resultNote = true;
		} else {
			resultNote = helper.matchesFilter(filter.note, note);
		}
		return resultChannel && resultNote;
	}
}
