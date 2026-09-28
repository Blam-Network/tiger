import { PoodleError } from "./poodle_error.js";

// MSB-first bit reader over data[start, end), refilled from big-endian
// loads. Past the end it shifts in zeros, and callers compare
// consumed_bytes() against what the stream says it holds.
export class c_bit_reader {
  readonly data: Uint8Array;
  readonly start: number;
  readonly end: number;
  // The next byte to load.
  pos: number;
  // The next bits of the stream, MSB first; only `count` of them are loaded,
  // the rest are zero.
  bits = 0;
  count = 0;

  constructor(data: Uint8Array, start: number, end: number) {
    this.data = data;
    this.start = start;
    this.end = end;
    this.pos = start;
    this.refill();
  }

  // Leaves at least 25 bits loaded.
  refill(): void {
    while (this.count <= 24) {
      const byte = this.pos < this.end ? this.data[this.pos] : 0;
      this.bits |= byte << (24 - this.count);
      this.pos++;
      this.count += 8;
    }
  }

  // n <= 24
  read(n: number): number {
    if (this.count < n) {
      this.refill();
    }
    if (n === 0) {
      return 0;
    }
    const value = this.bits >>> (32 - n);
    this.bits <<= n;
    this.count -= n;
    return value;
  }

  // Only after a refill: n <= count.
  private skip(n: number): void {
    this.bits <<= n;
    this.count -= n;
  }

  // Counts the zeros before the next 1 and consumes both.
  unary(): number {
    let zeros = 0;
    for (;;) {
      this.refill();
      if (this.bits !== 0) {
        const run = Math.clz32(this.bits);
        this.skip(run + 1);
        return zeros + run;
      }
      zeros += this.count;
      this.count = 0;
      if (this.pos > this.end) {
        throw new PoodleError("bitstream ends inside a unary code");
      }
    }
  }

  consumed_bits(): number {
    return (this.pos - this.start) * 8 - this.count;
  }

  // Streams are byte padded: a partly used byte counts as consumed.
  consumed_bytes(): number {
    return (this.consumed_bits() + 7) >>> 3;
  }
}
