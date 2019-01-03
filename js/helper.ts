import * as $ from 'jquery'

export function bytes_to_signed(lsb: number, msb: number): number {
    const sign = msb & (1 << 7);
    const x = (((msb & 0xFF) << 8) | (lsb & 0xFF));
    if (sign) {
        return  (0xFFFF0000 | x);  // fill in most significant bits with 1's
    }else{
        return  x;
    }
}

export function convertArrayBufferToString(buf: number[]|Buffer, uri: boolean = true): string {
    const bufView = new Uint8Array(buf);
    const encodedString = String.fromCharCode.apply(null, bufView);
    if (uri) {
        return decodeURIComponent(encodedString);
    } else {
        return encodedString;
    }
}

export function convertStringToArrayBuffer(str: string): ArrayBuffer {
    const buf=new ArrayBuffer(str.length);
    const bufView=new Uint8Array(buf);
    for (let i=0; i<str.length; i++) {
        bufView[i]=str.charCodeAt(i);
    }
    return buf;
}

export function changeMenuEntry(menu: string, id: string, newName: string): void {
    const items = (<W2UI.W2Menu>$('#toolbar').w2toolbar({}).get(menu, false)).items;
    for (let i = 0;i<items.length;i++) {
        if (items[i].id==id) {
            items[i].text = newName;
            $('#toolbar').w2toolbar({}).set(menu, items);
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
    const mnu = <W2UI.W2Menu>$('#toolbar').w2toolbar({}).get(menu, false);
    mnu.items = [{text: text, icon: icon, id: id}].concat(mnu.items);
}

export function removeMenuEntry(menu: string, id: string): void {
    const mnu = <W2UI.W2Menu>$('#toolbar').w2toolbar({}).get(menu, false);
    const items = mnu.items;
    for (let i = 0;i<items.length;i++) {
        if (items[i].id==id) {
            mnu.items.splice(i, 1);
            return;
        }
    }
    console.log("Didn't find name to remove!");
}

export function warn(message: string, onConfirmed: Function) {
    w2ui.w2confirm(message)
        .no(()=>{ })
        .yes(onConfirmed);
}