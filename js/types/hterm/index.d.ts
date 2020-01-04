declare namespace lib.Storage {
    class Memory {

    }
}
declare class TerminalIO {
    push(): TerminalIO;

    println(arg: any);

    print(arg: any);

    onVTKeystroke: (string) => any;

    sendString: (string) => any;
}

declare namespace hterm {
    let defaultStorage: lib.Storage.Memory;

    class Terminal {
        new(): Terminal;

        io: TerminalIO;

        onTerminalReady: () => any;

        processInput: (string) => any;

        decorate(el: Element);

        installKeyboard();
    }
}