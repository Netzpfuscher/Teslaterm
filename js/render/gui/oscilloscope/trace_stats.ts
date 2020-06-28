export class TraceStats {
    private min: number = Number.POSITIVE_INFINITY;
    private max: number = Number.NEGATIVE_INFINITY;
    private squareSum: number = 0;
    private samples: number = 0;

    public update(value_real: number): void {
        if (value_real < this.min) {
            this.min = value_real;
        }
        if (value_real > this.max) {
            this.max = value_real;
        }
        this.squareSum += (value_real * value_real);
        this.samples++;
    }

    public get_min_str(): string {
        return this.min.toFixed(2);
    }

    public get_max_str(): string {
        return this.max.toFixed(2);
    }

    public get_rms_str(): string {
        return Math.sqrt(this.squareSum / this.samples).toFixed(2);
    }
}
