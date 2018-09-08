class term_ui {
	static inputIpAddress(msg, title, reqIp, reqPort, callBack, defIp, defPort) {
		var $ = jQuery;
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
		var process = function () {
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
			if (typeof callBack == 'function') setTimeout(callBack, 100, ip, port);
		};
		if ($('#w2ui-popup').length > 0 && w2popup.status != 'closing') {
		    w2popup.message({
		        width   : 400,
		        height  : 170,
		        body    : bodyHtml,
		        buttons : '<button class="w2ui-popup-btn w2ui-btn">' + w2utils.lang('Ok') + '</button>',
				onOpen: () => setTimeout(() =>
					$('#w2ui-popup .w2ui-popup-btn')[0].onclick = () => {
						process();
						w2popup.message();
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
				onOpen: () => setTimeout(() =>
					$('#w2ui-popup .w2ui-popup-btn')[0].onclick = () => {
						process();
						w2popup.close();
					}, 10),
				onKeydown: this.keyDownListener
		    });
		}
	}

	static inputStrings(msg, title, callBack, names) {
		var $ = jQuery;
		if (title == null) title = w2utils.lang('Notification');
		var bodyHtml = '<div class="w2ui-centered w2ui-alert-msg" style="font-size: 13px;"><br>' + msg + '<br>';
		for (let i = 0; i < names.length; i++) {
			bodyHtml += '<br>' + names[i] + ': <input id="input' + i + '">';
		}
		let onOk = () => {
			let input = [];
			let inputFields = [];
			for (let i = 0; i < names.length; i++) {
				inputFields.push($('#w2ui-popup .w2ui-box .w2ui-popup-body #input' + i)[0]);
				input.push(inputFields[i].value);
			}
			const failedId = callBack(...input);
			if (failedId >= 0) {
				inputFields[failedId].style.backgroundColor = "red";
				inputFields[failedId].focus();
				setTimeout(()=>inputFields[failedId].style.backgroundColor = "white", 750);
				return false;
			} else {
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
				onOpen: () => setTimeout(() =>
					$('#w2ui-popup .w2ui-popup-btn')[0].onclick = () => {
						if (onOk()) {
							w2popup.message();
						}
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
				onOpen: () => setTimeout(() =>
					$('#w2ui-popup .w2ui-popup-btn')[0].onclick = () => {
						if (onOk()) {
							w2popup.close();
						}
					}, 10)
			});
		}
	}



	//INTERNAL USE ONLY
	static keyDownListener(event) {
		// if there are no messages
		if ($('#w2ui-popup .w2ui-message').length === 0) {
			switch (event.originalEvent.keyCode) {
				case 13: // enter
					$('#w2ui-popup .w2ui-popup-btn').focus().addClass('clicked'); // no need fo click as enter will do click
					break;
				case 27: // esc
					// Don't click Ok when the user pressed escape
					w2popup.close();
					break;
			}
		}
	}
}
