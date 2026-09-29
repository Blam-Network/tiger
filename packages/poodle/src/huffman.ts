import type { c_bit_reader } from "./bit_reader.ts";
import { PoodleError } from "./poodle_error.ts";

const k_max_code_length = 16;

// Codes this long or shorter decode with one lookup. Purely a speed knob.
const k_fast_bits = 11;
const k_slow_entry = 0xff_ff;

// A canonical prefix code: codes are handed out shortest first, symbols of
// equal length in index order.
export class c_huffman_table {
  // Indexed by the next k_fast_bits of the stream: (symbol << 5) | length,
  // or k_slow_entry when the code is longer.
  readonly fast = new Uint16Array(1 << k_fast_bits);
  // For the longer codes, working on the next 16 bits w: the length is the
  // first one with w < limits[length], the symbol
  // sorted[(w >>> (16 - length)) - bases[length]].
  readonly limits = new Int32Array(k_max_code_length + 1);
  readonly bases = new Int32Array(k_max_code_length + 1);
  readonly sorted: Uint16Array;
  // How many symbols have a code. A lone symbol is sent with no bits at all.
  used = 0;
  lone_symbol = 0;

  constructor(symbol_count: number) {
    this.sorted = new Uint16Array(symbol_count);
  }

  // The code at the top of `window` (a bit reader's window with at least 16
  // bits loaded), as (symbol << 5) | length.
  lookup(window: number): number {
    const entry = this.fast[window >>> (32 - k_fast_bits)];
    if (entry !== k_slow_entry) {
      return entry;
    }
    const top = window >>> 16;
    let length = k_fast_bits + 1;
    while (top >= this.limits[length]) {
      length++;
    }
    const symbol = this.sorted[(top >>> (16 - length)) - this.bases[length]];
    return (symbol << 5) | length;
  }
}

function bit_width(value: number): number {
  return 32 - Math.clz32(value);
}

// An Elias-gamma-like count: z zeros, a 1, then z + 1 more bits; the 1 and
// those bits read as a binary number v >= 2, and the count is v - 1.
function read_run(reader: c_bit_reader): number {
  const zeros = reader.unary();
  if (zeros > 20) {
    throw new PoodleError("Huffman run length too long");
  }
  return 2 ** (zeros + 1) + reader.read(zeros + 1) - 1;
}

// Lengths as runs: alternating runs of absent symbols and of present ones,
// with each present length coded against a running average.
function read_run_lengths(reader: c_bit_reader, lengths: Uint8Array): number {
  const symbol_count = lengths.length;
  const forced_bits = reader.read(2);
  // A quarter-bit fixed point average, starting at a flat code's length.
  let average = bit_width(symbol_count - 1) * 4;
  let used = 0;
  let symbol = 0;
  let skip_zeros = reader.read(1) === 1;
  for (;;) {
    if (!skip_zeros) {
      const run = read_run(reader);
      if (run > symbol_count - symbol) {
        throw new PoodleError("Huffman zero run past the alphabet");
      }
      symbol += run;
      if (symbol >= symbol_count) {
        break;
      }
    }
    skip_zeros = false;
    const run = read_run(reader);
    if (run > symbol_count - symbol) {
      throw new PoodleError("Huffman length run past the alphabet");
    }
    for (let i = 0; i < run; i++) {
      // z zeros and a 1, then forced_bits more: v = (z << forced_bits) + those
      // bits, a zigzag coded delta from the rounded average.
      const zeros = reader.unary();
      const v = zeros * (1 << forced_bits) + reader.read(forced_bits);
      const delta = v & 1 ? -(v >>> 1) - 1 : v >>> 1;
      const length = ((average + 2) >> 2) + delta;
      if (length < 1 || length > 30) {
        throw new PoodleError("Huffman code length out of range");
      }
      lengths[symbol++] = length;
      used++;
      average = ((3 * average + 2) >> 2) + length;
    }
    if (symbol >= symbol_count) {
      break;
    }
  }
  return used;
}

// Few symbols: a count, then (symbol, length) pairs in rising symbol order.
function read_sparse_lengths(
  reader: c_bit_reader,
  lengths: Uint8Array,
  table: c_huffman_table
): number {
  const symbol_count = lengths.length;
  const symbol_bits = bit_width(symbol_count - 1);
  const used = reader.read(symbol_bits);
  if (used > symbol_count) {
    throw new PoodleError("too many Huffman symbols");
  }
  if (used === 1) {
    const symbol = reader.read(symbol_bits);
    if (symbol >= symbol_count) {
      throw new PoodleError("Huffman symbol out of range");
    }
    table.lone_symbol = symbol;
    return 1;
  }
  if (used === 0) {
    return 0;
  }
  const length_bits = reader.read(3);
  if (length_bits > 5) {
    throw new PoodleError("bad Huffman length width");
  }
  let last = -1;
  for (let i = 0; i < used; i++) {
    const symbol = reader.read(symbol_bits);
    const length = reader.read(length_bits) + 1;
    if (symbol >= symbol_count || symbol <= last) {
      throw new PoodleError("bad Huffman symbol order");
    }
    lengths[symbol] = length;
    last = symbol;
  }
  return used;
}

// Codes of each length get consecutive values; the code must be complete.
function build(table: c_huffman_table, lengths: Uint8Array): void {
  const counts = new Int32Array(k_max_code_length + 1);
  for (const length of lengths) {
    if (length > k_max_code_length) {
      throw new PoodleError("Huffman code too long");
    }
    counts[length]++;
  }
  counts[0] = 0;
  const first_index = new Int32Array(k_max_code_length + 1);
  const first_code = new Int32Array(k_max_code_length + 1);
  let code = 0;
  let index = 0;
  for (let length = 1; length <= k_max_code_length; length++) {
    first_code[length] = code;
    first_index[length] = index;
    table.bases[length] = code - index;
    code += counts[length];
    index += counts[length];
    table.limits[length] = code << (k_max_code_length - length);
    code <<= 1;
  }
  // Complete: the longest codes use up the code space, so every 16-bit
  // window is below some limit and the search in lookup() ends.
  if (code !== 1 << (k_max_code_length + 1)) {
    throw new PoodleError("incomplete Huffman code");
  }

  const next = first_index.slice();
  for (let symbol = 0; symbol < lengths.length; symbol++) {
    const length = lengths[symbol];
    if (length) {
      table.sorted[next[length]++] = symbol;
    }
  }

  table.fast.fill(k_slow_entry);
  for (let length = 1; length <= k_fast_bits; length++) {
    const span = 1 << (k_fast_bits - length);
    for (let i = 0; i < counts[length]; i++) {
      const symbol = table.sorted[first_index[length] + i];
      const start = (first_code[length] + i) * span;
      table.fast.fill((symbol << 5) | length, start, start + span);
    }
  }
}

// The table block that opens a quantum when its header asks for new tables.
// The code lengths come in one of two layouts, picked by the first bit.
export function read_huffman_table(
  reader: c_bit_reader,
  symbol_count: number
): c_huffman_table {
  const table = new c_huffman_table(symbol_count);
  const lengths = new Uint8Array(symbol_count);
  const runs = reader.read(1) === 1;
  const used = runs
    ? read_run_lengths(reader, lengths)
    : read_sparse_lengths(reader, lengths, table);
  table.used = used;
  if (used === 0) {
    throw new PoodleError("empty Huffman table");
  }
  if (used === 1) {
    // Only the sparse layout can send a lone symbol; the run layout has no
    // table to decode one from.
    if (runs) {
      throw new PoodleError("single-symbol Huffman table in run layout");
    }
    table.fast.fill(table.lone_symbol << 5);
    return table;
  }
  build(table, lengths);
  return table;
}
