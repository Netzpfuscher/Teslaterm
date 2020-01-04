
type BothConsumer = (ip: string, port: number) => any;
type IPConsumer = (ip: string) => any;
type PortConsumer = (port: number) => any;
type IpPortConsumer = BothConsumer | IPConsumer | PortConsumer;

function inputIpAddressImpl(msg: string, title: string, reqIp: boolean, reqPort: boolean, defIp: string = undefined,
                            defPort: number = undefined): Promise<IpPortConsumer> {
    let resolve: (value?: (PromiseLike<IpPortConsumer> | IpPortConsumer)) => void = ()=>{};
    let reject: ()=>any = ()=>{};
    if (title == null) title = w2utils.lang('Notification');
    let bodyHtml: string = '<div class="w2ui-centered w2ui-alert-msg" style="font-size: 13px;"><br>' + msg;
    if (reqIp) {
        if (!defIp) {
            defIp = "localhost";
        }
        bodyHtml += '<br>IP: <input id="ipIn" placeholder="'+defIp+'">';
    }
    if (reqPort) {
        let defPortString: string;
        if (!defPort) {
            defPortString = "";
        } else {
            defPortString = defPort.toString();
        }
        bodyHtml += '<br>Port: <input id="portIn" type="number" max="65535" min="0" value="'+defPortString+'">';
    }
    bodyHtml += "</div>";
    const process = function (success) {
        if (success) {
            let ip: string;
            if (reqIp) {
                ip = (<HTMLInputElement>$('#w2ui-popup .w2ui-box .w2ui-popup-body #ipIn')[0]).value;
                if (!ip) {
                    ip = defIp;
                }
            } else {
                ip = null;
            }

            let port: number;
            if (reqPort) {
                port = Number((<HTMLInputElement>$('#w2ui-popup .w2ui-box .w2ui-popup-body #portIn')[0]).value);
            } else {
                port = null;
            }
            if (ip&&port) {
                setTimeout(resolve, 10, ip, port);
            } else if (ip) {
                setTimeout(resolve, 10, ip, undefined);
            } else {
                setTimeout(resolve, 10, undefined, port);
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
                    w2popup.message({});
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
    return new Promise<IpPortConsumer>((res, rej)=>{
        resolve = res;
        reject = rej;
    });
}

export function inputIpAndPort(msg: string, title: string, defIp: string = undefined, defPort: number = undefined): Promise<BothConsumer> {
    return <Promise<BothConsumer>>inputIpAddressImpl(msg, title, true, true, defIp, defPort);
}

export function inputPort(msg: string, title: string, defPort: number = undefined): Promise<PortConsumer> {
    return <Promise<PortConsumer>>inputIpAddressImpl(msg, title, false, true, undefined, defPort);
}

export function inputStrings(msg, title, checkValid, names) {
    const $ = jQuery;
    if (title == null) title = w2utils.lang('Notification');
    let bodyHtml:string = '<div class="w2ui-centered w2ui-alert-msg" style="font-size: 13px;"><br>' + msg + '<br>';
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
            inputFields[failedId].trigger("focus");
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
                        w2popup.message({});
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


function keyDownListener(event: W2UI.KeyDownListener) {
    // if there are no messages
    if ($('#w2ui-popup .w2ui-message').length === 0) {
        const btn = <HTMLButtonElement>($('#w2ui-popup .w2ui-popup-btn')[0]);
        switch (event.originalEvent.code) {
            case "Enter":
                btn.focus();
                btn.classList.add('clicked'); // no need fo click as enter will do click
                break;
            case "Escape":
                // Don't click Ok when the user pressed escape
                if (btn.onabort) {
                    btn.onabort(new UIEvent('abort'));
                }
                w2popup.close();
                break;
        }
    }
}