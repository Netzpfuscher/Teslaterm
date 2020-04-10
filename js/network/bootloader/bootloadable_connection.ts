export abstract class BootloadableConnection {
    public bootloaderCallback: ((data: Buffer) => void) | undefined;

    public enterBootloaderMode(dataCallback: (data: Buffer) => void): void {
        this.bootloaderCallback = dataCallback;
    }

    public leaveBootloaderMode(): void {
        this.bootloaderCallback = undefined;
    }

    public isBootloading(): boolean {
        return this.bootloaderCallback !== undefined;
    }

    public abstract sendBootloaderData(data: Buffer): Promise<void>;
}
