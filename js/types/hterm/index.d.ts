declare namespace lib.Storage {
    class Memory {

    }
}
declare class TerminalIO {
    println(arg: any);
}

declare namespace hterm {
    var defaultStorage: lib.Storage.Memory;

    class Terminal {
        new(): Terminal;

        io: TerminalIO;
    }
}