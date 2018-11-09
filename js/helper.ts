export function bytes_to_signed(lsb: number, msb: number): number {
    var sign = msb & (1 << 7);
    var x = (((msb & 0xFF) << 8) | (lsb & 0xFF));
    if (sign) {
        return  (0xFFFF0000 | x);  // fill in most significant bits with 1's
    }else{
        return  x;
    }
}

export function convertArrayBufferToString(buf: number[]|ArrayBuffer, uri: boolean = true): string {
    var bufView = new Uint8Array(buf);
    var encodedString = String.fromCharCode.apply(null, bufView);
    if (uri) {
        return decodeURIComponent(encodedString);
    } else {
        return encodedString;
    }
}

export function convertStringToArrayBuffer(str: string): ArrayBuffer {
    var buf=new ArrayBuffer(str.length);
    var bufView=new Uint8Array(buf);
    for (var i=0; i<str.length; i++) {
        bufView[i]=str.charCodeAt(i);
    }
    return buf;
}

export function changeMenuEntry(menu: string, id: string, newName: string): void {
    var items = $('#toolbar').w2toolbar().get(menu, false).items;
    for (var i = 0;i<items.length;i++) {
        if (items[i].id==id) {
            items[i].text = newName;
            $('#toolbar').w2toolbar().set(menu, items);
            return;
        }
    }
    console.log("Didn't find name to replace!");
}

export function parseFilter(str: string): number[][] {
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

export function matchesFilter(filter: number[][], num: number): boolean {
    for (let i = 0;i<filter.length;i++) {
        if (filter[i][0]<=num && num<=filter[i][1]) {
            return true;
        }
    }
    return false;
}

export function addFirstMenuEntry(menu: string, id: string, text: string, icon: string): void {
    const mnu = $('#toolbar').w2toolbar().get(menu, false);
    mnu.items = [{text: text, icon: icon, id: id}].concat(mnu.items);
}

export function removeMenuEntry(menu: string, id: string): void {
    const mnu = $('#toolbar').w2toolbar().get(menu, false);
    var items = mnu.items;
    for (var i = 0;i<items.length;i++) {
        if (items[i].id==id) {
            mnu.items.splice(i, 1);
            return;
        }
    }
    console.log("Didn't find name to remove!");
}