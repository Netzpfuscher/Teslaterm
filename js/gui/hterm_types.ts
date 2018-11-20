declare class TerminalIO {
    println(arg: any);
}

declare class Terminal {
    new (): Terminal;
    io: TerminalIO;
}