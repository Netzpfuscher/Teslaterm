declare const w2utils: W2UI.W2Utils;
declare namespace W2UI {
    export interface W2Utils {
        lang(notification: string);
    }
    export interface W2MenuItem {
        text: string;
        icon: string;
        id: string;
    }

    export interface W2Menu {
        items: W2MenuItem[];
    }
}