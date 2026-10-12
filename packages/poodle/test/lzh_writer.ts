// Builds LZH streams by hand for tests, bit for bit the way the decoder reads
// them. Not an encoder: it writes exactly the operations it's given.
import {
  k_escape_length,
  k_literal_count,
  k_match_lengths,
  k_offset_slot_count,
  k_offsets,
  k_rep_lengths,
  k_rep_packet_count,
} from "../src/lzh.ts";

type slot = readonly [number, number];

export class c_bit_writer {
  private readonly out: number[] = [];
  private pending = 0;
  private count = 0;

  // MSB first.
  bits(value: number, width: number): this {
    for (let i = width - 1; i >= 0; i--) {
      this.pending = this.pending * 2 + (Math.floor(value / 2 ** i) % 2);
      this.count++;
      if (this.count === 8) {
        this.out.push(this.pending);
        this.pending = 0;
        this.count = 0;
      }
    }
    return this;
  }

  align(): this {
    return this.count ? this.bits(0, 8 - this.count) : this;
  }

  bytes(): number[] {
    this.align();
    return this.out;
  }
}

function bit_width(value: number): number {
  return value ? value.toString(2).length : 0;
}

function length_of(lengths: ReadonlyMap<number, number>, symbol: number) {
  const length = lengths.get(symbol);
  if (length === undefined) {
    throw new Error(`symbol ${symbol} isn't in the table`);
  }
  return length;
}

// A complete prefix code over `symbols`, as flat as it gets; a lone symbol
// gets no bits.
export function flat_lengths(symbols: number[]): Map<number, number> {
  const unique = [...new Set(symbols)].sort((a, b) => a - b);
  const width = unique.length > 1 ? bit_width(unique.length - 1) : 0;
  const short = 2 ** width - unique.length;
  return new Map(unique.map((s, i) => [s, i < short ? width - 1 : width]));
}

function canonical_codes(lengths: ReadonlyMap<number, number>) {
  const entries = [...lengths].sort(([a, x], [b, y]) => x - y || a - b);
  const codes = new Map<number, number>();
  let code = 0;
  let last = entries[0]?.[1] ?? 0;
  for (const [symbol, length] of entries) {
    code *= 2 ** (length - last);
    last = length;
    codes.set(symbol, code);
    code++;
  }
  return codes;
}

// The sparse table layout: a count, then (symbol, length - 1) pairs.
export function write_sparse_table(
  writer: c_bit_writer,
  lengths: ReadonlyMap<number, number>
): void {
  const entries = [...lengths].sort(([a], [b]) => a - b);
  writer.bits(0, 1).bits(entries.length, 10);
  if (entries.length === 1) {
    for (const [symbol] of entries) {
      writer.bits(symbol, 10);
    }
    return;
  }
  const width = bit_width(Math.max(...lengths.values()) - 1);
  writer.bits(width, 3);
  for (const [symbol, length] of entries) {
    writer.bits(symbol, 10).bits(length - 1, width);
  }
}

// Slots are in rising order; a length takes the last one it reaches.
function length_slot(slots: readonly slot[], length: number): number {
  const index = slots.filter(([base]) => base <= length).length - 1;
  if (index < 0) {
    throw new Error(`length ${length} too short`);
  }
  return index;
}

function offset_slot(offset: number): number {
  if (offset <= 16) {
    return 0;
  }
  const index = k_offsets.findIndex(
    ([base, bits], i) => i > 0 && offset <= base + 2 ** bits
  );
  if (index < 0) {
    throw new Error(`offset ${offset} too far`);
  }
  return index;
}

type op =
  | { kind: "literal"; byte: number }
  | { kind: "match"; length: number; offset: number }
  | { kind: "rep"; index: number; length: number };

function symbol_of(o: op): number {
  switch (o.kind) {
    case "literal":
      return o.byte;
    case "rep":
      return k_literal_count + length_slot(k_rep_lengths, o.length);
    default:
      return (
        k_literal_count +
        k_rep_packet_count +
        length_slot(k_match_lengths, o.length) * k_offset_slot_count +
        offset_slot(o.offset)
      );
  }
}

// Where escape-coded lengths start, and their extra bits.
const k_escape_ranges: readonly slot[] = [
  [157, 6],
  [221, 7],
  [349, 8],
  [605, 10],
  [1629, 14],
];

function write_length(
  writer: c_bit_writer,
  slots: readonly slot[],
  length: number
): void {
  const [base, bits] = slots[length_slot(slots, length)];
  if (bits && base === k_escape_length) {
    const range = length_slot(k_escape_ranges, length);
    const [start, width] = k_escape_ranges[range];
    // The width as `range` ones, closed by a 0 unless it's the widest.
    writer.bits(2 ** range - 1, range);
    if (range < k_escape_ranges.length - 1) {
      writer.bits(0, 1);
    }
    writer.bits(length - start, width);
    return;
  }
  if (length - base >= 2 ** bits) {
    throw new Error(`length ${length} doesn't fit its slot`);
  }
  writer.bits(length - base, bits);
}

// One LZH quantum's operations. bytes() codes them with a table over exactly
// the symbols used, or with an earlier quantum's table.
export class c_lzh_quantum {
  private readonly ops: op[] = [];

  literal(text: string): this {
    for (const c of text) {
      this.ops.push({ kind: "literal", byte: c.charCodeAt(0) });
    }
    return this;
  }

  match(length: number, offset: number): this {
    this.ops.push({ kind: "match", length, offset });
    return this;
  }

  rep(index: number, length: number): this {
    this.ops.push({ kind: "rep", index, length });
    return this;
  }

  lengths(): Map<number, number> {
    return flat_lengths(this.ops.map(symbol_of));
  }

  // The quantum header and payload.
  bytes(table?: ReadonlyMap<number, number>): number[] {
    const writer = new c_bit_writer();
    const lengths = table ?? this.lengths();
    if (!table) {
      write_sparse_table(writer, lengths);
      writer.align();
    }
    const codes = canonical_codes(lengths);
    for (const o of this.ops) {
      const symbol = symbol_of(o);
      writer.bits(codes.get(symbol) ?? 0, length_of(lengths, symbol));
      if (o.kind === "rep") {
        writer.bits(o.index, 2);
        write_length(writer, k_rep_lengths, o.length);
      } else if (o.kind === "match") {
        const [base, bits] = k_offsets[offset_slot(o.offset)];
        writer.bits(o.offset - base - 1, bits);
        write_length(writer, k_match_lengths, o.length);
      }
    }
    const payload = writer.bytes();
    return [...quantum_header(payload.length, !table), ...payload];
  }
}

export function quantum_header(size: number, new_table: boolean): number[] {
  const word = size - 1 + (new_table ? 0x4000 : 0);
  return [Math.floor(word / 0x100), word % 0x100];
}
