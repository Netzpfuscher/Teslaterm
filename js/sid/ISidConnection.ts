export interface ISidConnection {
    onStart(): void;

    processFrame(frame: Uint8Array | Buffer, delay: number): Promise<void>;

    flush(): Promise<void>;

    isBusy(): boolean;
}
