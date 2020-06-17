import {SidFrame} from "./sid_api";

export interface ISidConnection {
    onStart(): void;

    processFrame(frame: SidFrame): Promise<void>;

    flush(): Promise<void>;

    isBusy(): boolean;
}
