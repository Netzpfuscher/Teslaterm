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
		var onClose = function () {
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
		        buttons : '<button onclick="w2popup.message();" class="w2ui-popup-btn w2ui-btn">' + w2utils.lang('Ok') + '</button>',
		        onClose : onClose,
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
		        buttons   : '<button onclick="w2popup.close();" class="w2ui-popup-btn w2ui-btn">' + w2utils.lang('Ok') + '</button>',
		        onClose   : onClose,
				onKeydown: this.keyDownListener
		    });
		}
	}

	static inputString(msg, title, callBack) {
		var $ = jQuery;
		if (title == null) title = w2utils.lang('Notification');
		var bodyHtml = '<div class="w2ui-centered w2ui-alert-msg" style="font-size: 13px;"><br>' + msg
					 + '<br><input id="input"></div>';
		var onClose = function () {
				var input = $('#w2ui-popup .w2ui-box .w2ui-popup-body #input')[0].value;
		        if (typeof callBack == 'function') setTimeout(callBack, 100, input);
		    };
		if ($('#w2ui-popup').length > 0 && w2popup.status != 'closing') {
		    w2popup.message({
		        width   : 400,
		        height  : 170,
		        body    : bodyHtml,
		        buttons : '<button onclick="w2popup.message();" class="w2ui-popup-btn w2ui-btn">' + w2utils.lang('Ok') + '</button>',
		        onClose : onClose,
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
		        buttons   : '<button onclick="w2popup.close();" class="w2ui-popup-btn w2ui-btn">' + w2utils.lang('Ok') + '</button>',
		        onClose   : onClose,
				onKeydown: this.keyDownListener
		    });
		}
	}

	//INTERNAL USE ONLY
	static keyDownListener(event) {
		// if there are no messages
		if ($('#w2ui-popup .w2ui-message').length === 0) {
			switch (event.originalEvent.keyCode) {
				case 13: // enter
					$('#w2ui-popup .w2ui-popup-btn#Ok').focus().addClass('clicked'); // no need fo click as enter will do click
					w2popup.close();
					break;
				case 27: // esc
					$('#w2ui-popup .w2ui-popup-btn#Ok').focus().click();
					w2popup.close();
					break;
			}
		}
	}
}
