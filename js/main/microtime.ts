export function now(): number {
    const now_bigint = process.hrtime.bigint();
    return Number((now_bigint) / BigInt(1000));
}
