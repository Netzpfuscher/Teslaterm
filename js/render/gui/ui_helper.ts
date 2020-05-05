type BothConsumer = (ip: string, port: number) => any;
type IPConsumer = (ip: string) => any;
type PortConsumer = (port: number) => any;
type IpPortConsumer = BothConsumer | IPConsumer | PortConsumer;

function inputIpAddressImpl(msg: string, title: string, reqIp: boolean, reqPort: boolean, defIp?: string,
                            defPort?: number): Promise<IpPortConsumer> {
    let resolve: (value?: (PromiseLike<IpPortConsumer> | IpPortConsumer)) => void = () => {
        // NOP
    };
    let reject: () => any = () => {
        // NOP
    };
    if (title === null) {
        title = w2utils.lang("Notification");
    }
    let bodyHtml: string = '<div class="w2ui-centered w2ui-alert-msg" style="font-size: 13px;"><br>' + msg;
    if (reqIp) {
        if (!defIp) {
            defIp = "localhost";
        }
        bodyHtml += '<br>IP: <input id="ipIn" placeholder="' + defIp + '">';
    }
    if (reqPort) {
        let defPortString: string;
        if (!defPort) {
            defPortString = "";
        } else {
            defPortString = defPort.toString();
        }
        bodyHtml += '<br>Port: <input id="portIn" type="number" max="65535" min="0" value="' + defPortString + '">';
    }
    bodyHtml += "</div>";
    const process = (success) => {
        if (success) {
            let ip: string;
            if (reqIp) {
                ip = ($("#w2ui-popup .w2ui-box .w2ui-popup-body #ipIn")[0] as HTMLInputElement).value;
                if (!ip) {
                    ip = defIp;
                }
            } else {
                ip = null;
            }

            let port: number;
            if (reqPort) {
                port = Number(($("#w2ui-popup .w2ui-box .w2ui-popup-body #portIn")[0] as HTMLInputElement).value);
            } else {
                port = null;
            }
            if (ip && port) {
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
    if ($("#w2ui-popup").length > 0 && w2popup.status !== "closing") {
        w2popup.message({
            body: bodyHtml,
            buttons: '<button class="w2ui-popup-btn w2ui-btn">' + w2utils.lang("Ok") + "</button>",
            height: 170,
            onKeydown: this.keyDownListener,
            onOpen: () => setTimeout(() => {
                const btn = $("#w2ui-popup .w2ui-popup-btn")[0];
                btn.onclick = () => {
                    process(true);
                    w2popup.message({});
                };
                btn.onabort = () => process(false);
            }, 10),
            width: 400,
        });
    } else {
        w2popup.open({
            body: bodyHtml,
            buttons: '<button class="w2ui-popup-btn w2ui-btn">' + w2utils.lang("Ok") + "</button>",
            height: 220,
            onKeydown: this.keyDownListener,
            onOpen: () => setTimeout(() => {
                const btn = $("#w2ui-popup .w2ui-popup-btn")[0];
                btn.onclick = () => {
                    process(true);
                    w2popup.close();
                };
                btn.onabort = () => process(false);
            }, 10),
            showClose: false,
            showMax: false,
            title,
            width: 450,
        });
    }
    return new Promise<IpPortConsumer>((res, rej) => {
        resolve = res;
        reject = rej;
    });
}

export function inputIpAndPort(msg: string, title: string, defIp?: string, defPort?: number): Promise<BothConsumer> {
    return inputIpAddressImpl(msg, title, true, true, defIp, defPort) as Promise<BothConsumer>;
}

export function inputPort(msg: string, title: string, defPort?: number): Promise<PortConsumer> {
    return inputIpAddressImpl(msg, title, false, true, undefined, defPort) as Promise<PortConsumer>;
}

export function inputStrings(msg, title, checkValid, names) {
    const $ = jQuery;
    if (title === null) {
        title = w2utils.lang("Notification");
    }
    let bodyHtml: string = '<div class="w2ui-centered w2ui-alert-msg" style="font-size: 13px;"><br>' + msg + "<br>";
    for (let i = 0; i < names.length; i++) {
        bodyHtml += "<br>" + names[i] + ': <input id="input' + i + '">';
    }
    let resolve = () => {
        // NOP
    };
    let reject = () => {
        // NOP
    };
    const onOk = () => {
        const input = [];
        const inputFields = [];
        for (let i = 0; i < names.length; i++) {
            inputFields.push($("#w2ui-popup .w2ui-box .w2ui-popup-body #input" + i)[0]);
            input.push(inputFields[i].value);
        }
        const failedId = checkValid(...input);
        if (failedId >= 0) {
            inputFields[failedId].style.backgroundColor = "red";
            inputFields[failedId].trigger("focus");
            setTimeout(() => inputFields[failedId].style.backgroundColor = "white", 750);
            return false;
        } else {
            setTimeout(resolve, 10, input.length === 1 ? input[0] : input);
            return true;
        }
    };
    if ($("#w2ui-popup").length > 0 && w2popup.status !== "closing") {
        w2popup.message({
            body: bodyHtml,
            buttons: '<button class="w2ui-popup-btn w2ui-btn">' + w2utils.lang("Ok") + "</button>",
            height: 170,
            onKeydown: this.keyDownListener,
            onOpen: () => setTimeout(() => {
                const btn = $("#w2ui-popup .w2ui-popup-btn")[0];
                btn.onclick = () => {
                    if (onOk()) {
                        w2popup.message({});
                    }
                };
                btn.onabort = () => setTimeout(reject, 10);
            }, 10),
            width: 400,
        });
    } else {
        w2popup.open({
            body: bodyHtml,
            buttons: '<button class="w2ui-popup-btn w2ui-btn">' + w2utils.lang("Ok") + "</button>",
            height: 220,
            onKeydown: this.keyDownListener,
            onOpen: () => setTimeout(() => {
                const btn = $("#w2ui-popup .w2ui-popup-btn")[0];
                btn.onclick = () => {
                    if (onOk()) {
                        w2popup.close();
                    }
                };
                btn.onabort = () => setTimeout(reject, 10);
            }, 10),
            showClose: false,
            showMax: false,
            title,
            width: 450,
        });
    }
    return new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
}


function keyDownListener(event: W2UI.KeyDownListener) {
    // if there are no messages
    if ($("#w2ui-popup .w2ui-message").length === 0) {
        const btn = ($("#w2ui-popup .w2ui-popup-btn")[0]) as HTMLButtonElement;
        switch (event.originalEvent.code) {
            case "Enter":
                btn.focus();
                btn.classList.add("clicked"); // no need fo click as enter will do click
                break;
            case "Escape":
                // Don't click Ok when the user pressed escape
                if (btn.onabort) {
                    btn.onabort(new UIEvent("abort"));
                }
                w2popup.close();
                break;
        }
    }
}

export function addFirstMenuEntry(menu: string, id: string, text: string, icon: string): void {
    const mnu = w2ui.toolbar.get(menu, false) as W2UI.W2Menu;
    mnu.items = [{text, icon, id}].concat(mnu.items);
}

export function removeMenuEntry(menu: string, id: string): void {
    const mnu = w2ui.toolbar.get(menu, false) as W2UI.W2Menu;
    const items = mnu.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].id === id) {
            mnu.items.splice(i, 1);
            return;
        }
    }
    console.log("Didn't find name to remove!");
}

export function warn(message: string, onConfirmed: () => void) {
    w2confirm(message)
        .no(() => {
        })
        .yes(onConfirmed);
}

export function changeMenuEntry(menu: string, id: string, newName: string): void {
    const items = (w2ui.toolbar.get(menu, false) as W2UI.W2Menu).items;
    for (const item of items) {
        if (item.id === id) {
            item.text = newName;
            w2ui.toolbar.set(menu, items);
            return;
        }
    }
    console.log("Didn't find name to replace!");
}

export function openPopup(options: Object): Promise<void> {
    return new Promise<void>((res, rej) => {
        options["onOpen"] = (event) => {
            event.onComplete = res;
        };
        w2popup.open(options);
    });
}
