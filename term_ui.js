class term_ui {
	static inputIpAddress(msg, title, reqIp, reqPort, defIp, defPort) {
		var $ = jQuery;
		let resolve = (both)=>{};
		let reject = ()=>{};
		if (title == null) title = w2utils.lang('Notification');
		var bodyHtml = '<div class="w2ui-centered w2ui-alert-msg" style="font-size: 13px;"><br>' + msg;
		if (reqIp) {
			if (!defIp) {
				defIp = "localhost";
			}
			bodyHtml += '<br>IP: <input id="ipIn" placeholder="'+defIp+'">';
		}
		if (reqPort) {
			if (!defPort) {
				defPort = "";
			}
			bodyHtml += '<br>Port: <input id="portIn" type="number" max="65535" min="0" value="'+defPort+'">';
		}
		bodyHtml += "</div>";
		var process = function (success) {
			if (success) {
				var ip;
				if (reqIp) {
					ip = $('#w2ui-popup .w2ui-box .w2ui-popup-body #ipIn')[0].value;
					if (!ip) {
						ip = defIp;
					}
				} else {
					ip = null;
				}

				var port = reqPort ? Number($('#w2ui-popup .w2ui-box .w2ui-popup-body #portIn')[0].value) : null;
				if (ip&&port) {
					setTimeout(resolve, 10, {ip: ip, port: port});
				} else if (ip) {
					setTimeout(resolve, 10, ip);
				} else {
					setTimeout(resolve, 10, port);
				}
			} else {
				setTimeout(reject, 10);
			}
		};
		if ($('#w2ui-popup').length > 0 && w2popup.status != 'closing') {
		    w2popup.message({
		        width   : 400,
		        height  : 170,
		        body    : bodyHtml,
		        buttons : '<button class="w2ui-popup-btn w2ui-btn">' + w2utils.lang('Ok') + '</button>',
				onOpen: () => setTimeout(() => {
					const btn = $('#w2ui-popup .w2ui-popup-btn')[0];
					btn.onclick = () => {
						process(true);
						w2popup.message();
					};
					btn.onabort = () =>process(false);
				}, 10),
				onKeydown: this.keyDownListener
			});
		} else {
		    w2popup.open({
		        width     : 450,
		        height    : 220,
		        showMax   : false,
		        showClose : false,
		        title     : title,
		        body      : bodyHtml,
		        buttons   : '<button class="w2ui-popup-btn w2ui-btn">' + w2utils.lang('Ok') + '</button>',
				onOpen: () => setTimeout(() => {
					const btn = $('#w2ui-popup .w2ui-popup-btn')[0];
					btn.onclick = () => {
						process(true);
						w2popup.close();
					};
					btn.onabort = () =>process(false);
				}, 10),
				onKeydown: this.keyDownListener
		    });
		}
		return new Promise((res, rej)=>{
			resolve = res;
			reject = rej;
		});
	}

	static inputStrings(msg, title, checkValid, names) {
		var $ = jQuery;
		if (title == null) title = w2utils.lang('Notification');
		var bodyHtml = '<div class="w2ui-left w2ui-alert-msg" style="font-size: 13px;"><br>' + msg + '<br>';
		for (let i = 0; i < names.length; i++) {
			bodyHtml += '<br>' + names[i] + ': <input id="input' + i + '">';
		}
		let resolve = ()=>{};
		let reject = ()=>{};
		let onOk = () => {
			let input = [];
			let inputFields = [];
			for (let i = 0; i < names.length; i++) {
				inputFields.push($('#w2ui-popup .w2ui-box .w2ui-popup-body #input' + i)[0]);
				input.push(inputFields[i].value);
			}
			const failedId = checkValid(...input);
			if (failedId >= 0) {
				inputFields[failedId].style.backgroundColor = "red";
				inputFields[failedId].focus();
				setTimeout(()=>inputFields[failedId].style.backgroundColor = "white", 750);
				return false;
			} else {
				setTimeout(resolve, 10, input.length==1?input[0]:input);
				return true;
			}
		};
		if ($('#w2ui-popup').length > 0 && w2popup.status != 'closing') {
			w2popup.message({
				width: 400,
				height: 170,
				body: bodyHtml,
				buttons: '<button class="w2ui-popup-btn w2ui-btn">' + w2utils.lang('Ok') + '</button>',
				onKeydown: this.keyDownListener,
				onOpen: () => setTimeout(() => {
					const btn = $('#w2ui-popup .w2ui-popup-btn')[0];
					btn.onclick = () => {
						if (onOk()) {
							w2popup.message();
						}
					};
					btn.onabort = ()=>setTimeout(reject, 10);
				}, 10)
			});
		} else {
			w2popup.open({
				width: 450,
				height: 220,
				showMax: false,
				showClose: false,
				title: title,
				body: bodyHtml,
				buttons: '<button class="w2ui-popup-btn w2ui-btn">' + w2utils.lang('Ok') + '</button>',
				onKeydown: this.keyDownListener,
				onOpen: () => setTimeout(() => {
					const btn = $('#w2ui-popup .w2ui-popup-btn')[0];
					btn.onclick = () => {
						if (onOk()) {
							w2popup.close();
						}
					};
					btn.onabort = ()=>setTimeout(reject, 10);
				}, 10)
			});
		}
		return new Promise((res, rej)=> {
			resolve = res;
			reject = rej;
		});
	}
	
	static ud_settings(uconfig) {
		let tfields = [];
		let trecords = [];
		//console.log(udconfig);
		for(let i=0;i<uconfig.length;i++){
			let data = uconfig[i];
			let inipage = simpleIni.get('config.'+data[0]);
			if(!inipage) inipage=0;
			switch (parseInt(data[2])){
				case TYPE_CHAR:
					tfields.push({ field: data[0], type: 'text', html: { caption: data[0],text: '<i>'+data[6]+'</i>' ,page: inipage, column: 0 } });
				break;
				case TYPE_FLOAT:
					tfields.push({ field: data[0], type: 'text', html: { caption: data[0],text: '<i>'+data[6] + '</i><br>       <b>MIN:</b> ' + data[4] + '   <b>MAX:</b> ' + data[5] ,page: inipage, column: 0 } });
				break;
				case TYPE_SIGNED:
					tfields.push({ field: data[0], type: 'text', html: { caption: data[0],text: '<i>'+data[6] + '</i><br>       <b>MIN:</b> ' + data[4] + '   <b>MAX:</b> ' + data[5] ,page: inipage, column: 0 } });
				break;
				case TYPE_STRING:
					tfields.push({ field: data[0], type: 'text', html: { caption: data[0],text: '<i>'+data[6]+'</i>' ,page: inipage, column: 0 } });
				break;
				case TYPE_UNSIGNED:
					tfields.push({ field: data[0], type: 'text', html: { caption: data[0],text: '<i>'+data[6] + '</i><br>       <b>MIN:</b> ' + data[4] + '   <b>MAX:</b> ' + data[5] ,page: inipage, column: 0 } });
				break;			
			}
		
			trecords[data[0]] = data[1];
		}	

		if (w2ui.foo) {
				w2ui.foo.original = [];
				w2ui.foo.record = [];
			for(let copy in trecords){
				w2ui.foo.original[copy] =  trecords[copy];
				w2ui.foo.record[copy] =  trecords[copy];
			}
			w2ui.foo.refresh();
		}
		
		if (!w2ui.foo) {
			$().w2form({
				name: 'foo',
				style: 'border: 0px; background-color: transparent;',
				tabs: [
				{ id: 'tab1', caption: 'General' },
				{ id: 'tab2', caption: 'Timing'},
				{ id: 'tab3', caption: 'Feedback'},
				{ id: 'tab4', caption: 'IP'},
				{ id: 'tab5', caption: 'Serial'},
				{ id: 'tab6', caption: 'Current'},
				],
				fields: tfields,
				record: trecords,
				actions: {
					"save": function () { 
						for (let changes in this.getChanges()){
							this.record[changes] = this.record[changes].replace(',','.');
							send_command('set ' + changes + ' ' + this.record[changes] + '\r');
							this.original[changes] = this.record[changes];
						}
						w2popup.close();
					},
					"save EEPROM": function () { 
						for (let changes in this.getChanges()){
							this.record[changes] = this.record[changes].replace(',','.');
							send_command('set ' + changes + ' ' + this.record[changes] + '\r');
							this.original[changes] = this.record[changes];
						}
						send_command('eeprom save\r');
						w2popup.close();
					}	
				}
			});
		}

		$().w2popup('open', {
			title   : 'UD3 Settings',
			body    : '<div id="form" style="width: 100%; height: 100%;"></div>',
			style   : 'padding: 15px 0px 0px 0px',
			width   : 650,
			height  : 650, 
			showMax : true,
			onToggle: function (event) {
				$(w2ui.foo.box).hide();
				event.onComplete = function () {
					$(w2ui.foo.box).show();
					w2ui.foo.resize();
				}
			},
			onOpen: function (event) {
				event.onComplete = function () {
					// specifying an onOpen handler instead is equivalent to specifying an onBeforeOpen handler, which would make this code execute too early and hence not deliver.
					$('#w2ui-popup #form').w2render('foo');
				}
			}
		});
	}
	
	//INTERNAL USE ONLY
	static keyDownListener(event) {
		// if there are no messages
		if ($('#w2ui-popup .w2ui-message').length === 0) {
			const btn = $('#w2ui-popup .w2ui-popup-btn');
			switch (event.originalEvent.keyCode) {
				case 13: // enter
					btn.focus().addClass('clicked'); // no need fo click as enter will do click
					break;
				case 27: // esc
					// Don't click Ok when the user pressed escape
					if (btn.onabort) {
						btn.onabort();
					}
					w2popup.close();
					break;
			}
		}
	}
}
