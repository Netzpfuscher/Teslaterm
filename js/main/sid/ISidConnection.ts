import {getOptionalUD3Connection} from "../connection/connection";
import {SidFrame} from "./sid_api";

export interface ISidConnection {
    onStart(): void;

    processFrame(frame: SidFrame): Promise<void>;

    flush(): Promise<void>;

    isBusy(): boolean;
}

export function getActiveSIDConnection(): ISidConnection | null {
    return getOptionalUD3Connection()?.getSidConnection();
}
