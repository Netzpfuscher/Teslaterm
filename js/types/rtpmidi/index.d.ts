declare namespace rtpmidi {
    let manager: Manager;

    class Session {
        on(event: "message", callback: (delta: number, message: number[]) => void);
    }

    class Manager {
        createSession(config: {
            localName: string,
            bonjourName: string,
            port: number,
        }): Session;
    }
}
