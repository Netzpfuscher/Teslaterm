let baseTime: bigint;

export function now(): number {
    const now_bigint = process.hrtime.bigint();
    if (!baseTime) {
        // TODO remove once TT is updated for a version of UD3 that can handle 0xFF in time
        baseTime = now_bigint - BigInt(1_000_000 * Date.now());
    }
    return Number((now_bigint - baseTime) / BigInt(1000));
}
