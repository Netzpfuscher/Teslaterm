declare class W2Utils {
    lang(notification: string);
}
declare var w2utils:W2Utils;

declare class W2MenuItem {
    text: string;
    icon: string;
    id: string;
}

declare class W2Menu {
    items: W2MenuItem[];
}