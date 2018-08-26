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

class MidiIpServer {
	
	constructor(port, println, ttName) {
		this.println = println;
		this.ttName = ttName;
		this.ttNameAsBuffer = helper.convertStringToArrayBuffer(ttName);
		this.port = port;
		this.clients = [];

		console.log(this.port);
		chrome.sockets.tcpServer.create({}, info=>this.createCallback(info));
	}

	//PUBLIC METHODS
	/**
	 * Sends `data` to all connected sockets that accept the data.
	 * Returns null if no socket fully accepts the data (see filter definition), `data` otherwise
	*/
	sendToAllAccepting(data) {
		var ret = data;
		for (var i = 0;i<this.clients.length;i++) {
			//TODO check whether the socket accepts this data
			var client = this.clients[i];
			var iConst = i;
			chrome.sockets.tcp.send(client.socketId, data, sendInfo => {
				if (sendInfo.resultCode<0) {
					this.println("TCP MIDI client \""+client.name+"\" disconnected!");
					this.clients[iConst] = this.clients[this.clients.length-1];
					this.clients.pop();
				}
			});
		}
		return ret;
	}

	//INTERNAL USE ONLY!
	createCallback(createInfo) {
		var socketId = createInfo.socketId;
		console.log(this);
		chrome.sockets.tcpServer.listen(socketId,
			"127.0.0.1", this.port, resultCode=>this.onListenCallback(socketId, resultCode)
		);
	}

	onListenCallback(socketId, resultCode) {
		if (resultCode < 0) {
			console.log("Error listening: " +
				chrome.runtime.lastError.message);
			return;
		}
		this.serverSocketId = socketId;
		chrome.sockets.tcpServer.onAccept.addListener(info=>this.onAccept(info));
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
			this.clients.push({socketId: info.clientSocketId, name: remoteName});//Object to make adding filter data later easier
		};
		chrome.sockets.tcp.onReceive.addListener(receiveListener);
		chrome.sockets.tcp.setPaused(info.clientSocketId, false);
	}
}
