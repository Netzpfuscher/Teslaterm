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

    export interface KeyDownListener {
        originalEvent: KeyboardEvent;
    }
}

declare interface ConfirmationHandler {
    yes(handler: () => void): ConfirmationHandler;

    no(handler: () => void): ConfirmationHandler;
}

declare function w2confirm(text: string, title?: string): ConfirmationHandler;