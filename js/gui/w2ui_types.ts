import 'w2ui';
import W2Item = W2UI.W2Item;

export declare class W2Utils {
    lang(notification: string);
}
export declare var w2utils:W2Utils;

export declare class W2MenuItem {
    text: string;
    icon: string;
    id: string;
}

export declare class W2Menu {
    items: W2MenuItem[];
}