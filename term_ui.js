class term_ui {
	static inputIpAddress(msg, title, reqIp, reqPort, callBack) {
		var $ = jQuery;
		if (title == null) title = w2utils.lang('Notification');
		var bodyHtml = '<div class="w2ui-centered w2ui-alert-msg" style="font-size: 13px;"><br>' + msg;
		if (reqIp) {
			bodyHtml += '<br>IP: <input id="ipIn"></input>';
		}
		if (reqPort) {
			bodyHtml += '<br>Port: <input id="portIn" type="number"></input> </div>';
		}
		var onClose = function () {
				var ip = reqIp?$('#w2ui-popup .w2ui-box .w2ui-popup-body #ipIn')[0].value:null;
				var port = reqPort?Number($('#w2ui-popup .w2ui-box .w2ui-popup-body #portIn')[0].value):null;
		        if (typeof callBack == 'function') callBack(ip, port);
		    };
		if ($('#w2ui-popup').length > 0 && w2popup.status != 'closing') {
		    w2popup.message({
		        width   : 400,
		        height  : 170,
		        body    : bodyHtml,
		        buttons : '<button onclick="w2popup.message();" class="w2ui-popup-btn w2ui-btn">' + w2utils.lang('Ok') + '</button>',
		        onClose : onClose
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
		        onClose   : onClose
		    });
		}
		return {
		    ok: function (fun) {
		        callBack = fun;
		        return this;
		    },
		    done: function (fun) {
		        callBack = fun;
		        return this;
		    }
		};
	}
}
